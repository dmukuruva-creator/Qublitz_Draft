// IN-4 — scripted responsive regression capture. Loads the standalone
// quantum_chess.html directly (file://, no server needed — the game is
// fully self-contained) and screenshots it at each width below, flagging
// any console error/pageerror per width.
//
// Supported widths (the game itself, FE-9): 640/768/1024/1440px — a vs-Bot
// match is started and one real move made so the side panels and gate menu
// have real content in the screenshot, not placeholder dashes.
//
// Phone widths (the FE-9 interstitial, not the game): 390px. USER RULING
// 2026-07-07 decided phones are UNSUPPORTED — quantum_chess.html shows a
// full-screen "open this on a bigger screen" interstitial below ~600px CSS
// width instead of the game (see the #phone-gate CSS/HTML/script blocks).
// 390px stays in this file only to assert that interstitial renders and
// that its "try anyway" dismiss link actually works — it does NOT run the
// gameplay-setup flow below, since the game is deliberately unreachable at
// that width until dismissed. (Before FE-9, 390px ran the full gameplay
// flow too — added during a C03 pass (IN-1) that found ~15 CSS px touch
// targets at phone width; that regression class is now moot since phones
// don't see the game at all, but the interstitial itself still needs a
// standing check.)
//
// Requires the `playwright` package. 2026-07-08: installed permanently as a
// devDependency (`npm install --save-dev playwright && npx playwright
// install chromium`) — node_modules/ is gitignored so it never lands in a
// commit, but it now persists across sessions instead of being installed
// and removed ad hoc each time.
//
// SUPPORTED_HEIGHT (FE-10, 2026-07-11): the game-viewport capture used to
// derive height as width*1.6 (390px -> 624, ..., 1440px -> 2304). That's a
// portrait-ish ratio that made sense for the old 390px phone-flow capture,
// but at 1440px it manufactures a viewport no real desktop monitor has
// (2304px tall) — a real 1440-wide monitor is usually *shorter* than 1440
// (16:9/16:10 ≈ 810-900px), not 1.6x taller. FE-10's own board-void
// measurement found this mattered: 18px deficit at a realistic 1440x900,
// vs. 1172px at the script's old synthetic 1440x2304 — most of the
// "void" earlier captures showed was the convention, not the layout.
// A resized-but-not-shortened browser window (the common real case —
// people narrow width more than height, or half-snap left/right) keeps
// close to full monitor height regardless of width, so one fixed
// realistic height across all supported widths is more representative
// than scaling with width at all. 900px matches a common 16:10 laptop
// panel and is exactly the height FE-10 already validated by hand.
//
// Run: node tests/capture_responsive.js
'use strict';
const path = require('path');
const fs = require('fs');

const PHONE_WIDTHS = [390];
const SUPPORTED_WIDTHS = [640, 768, 1024, 1440];
const SUPPORTED_HEIGHT = 900;
const OUT_DIR = path.join(__dirname, '..', '_arena_screenshots');
const GAME_URL = 'file://' + path.join(__dirname, '..', 'quantum_chess.html');

// FE-9 — phone width: verify the interstitial (not the game) is what
// renders, screenshot it, then verify "try anyway" actually dismisses it.
async function capturePhoneGate(chromium, width) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width, height: Math.round(width * 1.6) },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(GAME_URL, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const gateDisplay = await page.locator('#phone-gate').evaluate(el => getComputedStyle(el).display);
  if (gateDisplay === 'none') errors.push(`#phone-gate did not render at ${width}px (display: none)`);

  // Viewport-only, not fullPage: #phone-gate is position:fixed, so this is
  // exactly what a real phone user sees on-screen (fullPage's viewport-
  // resize-then-stitch approach only renders a fixed element once, at the
  // top of the tall composite — that's a screenshot-tooling artifact, not
  // a bug, but it's a confusing capture for eyeballing this specific check).
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${width}px.png`);
  await page.screenshot({ path: file, fullPage: false });

  // "Try anyway" — must dismiss for this session (never brick the page).
  await page.locator('#phone-gate-anyway').click({ timeout: 3000 }).catch(e => errors.push('try-anyway click failed: ' + e.message));
  await page.waitForTimeout(150);
  const dismissedDisplay = await page.locator('#phone-gate').evaluate(el => getComputedStyle(el).display);
  if (dismissedDisplay !== 'none') errors.push('"try anyway" did not dismiss #phone-gate');

  await browser.close();
  return { width, file, errors };
}

async function captureWidth(chromium, width) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width, height: SUPPORTED_HEIGHT },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(GAME_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));

  // FE-9 regression guard: a supported width must never show the phone
  // interstitial (the media query is max-width:599px; every entry in
  // SUPPORTED_WIDTHS is comfortably above that, but a future edit to the
  // breakpoint could silently break this — catch it here, not live).
  const gateDisplay = await page.locator('#phone-gate').evaluate(el => getComputedStyle(el).display);
  if (gateDisplay !== 'none') errors.push(`#phone-gate incorrectly rendered at supported width ${width}px`);

  // Skip the boot screen via click (works for both mouse-only and touch users).
  await page.mouse.click(10, 10).catch(() => {});
  await page.waitForTimeout(300);
  // The board's "PLAY vs BOT" button retired with the board (2026-07-27).
  // Capture the Photon Duel — that is what this page now is.
  if (await page.locator('#boot').isVisible().catch(() => false)) {
    await page.locator('#boot').click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => startDuel(11))
    .catch(e => errors.push('could not start duel: ' + e.message));
  await page.waitForTimeout(600);

  // Select + move a white unit so the side panels and gate menu have real
  // content in the screenshot, not placeholder dashes.
  const canvas = await page.$('#game-canvas');
  if (canvas) {
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width * 0.18, box.y + box.height * 0.94);
    await page.waitForTimeout(200);
    await page.mouse.click(box.x + box.width * 0.18, box.y + box.height * 0.72);
    // FE-11: the move triggers a proactive sage tip via the typewriter
    // effect (20ms/char) — a fixed 400ms wait only ever caught it a few
    // characters in, which looked exactly like the mid-sentence clipping
    // bug in every past capture even after that bug was fixed. Wait for
    // the typewriter to actually finish so the capture shows a complete,
    // representative message instead of a permanently-misleading snapshot.
    await page.waitForFunction(() => window._sageTyping === null, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(150);
  }

  // FE-10: the "board-void" measurement, made a standing informational
  // check instead of a one-time DevTools reading. #root's own content
  // height (not scrollHeight, which has a browser quirk of always being
  // >= viewport height regardless of actual box height — see FE-10's note)
  // vs. the viewport height tells us how much of the fixed-background page
  // below the content is empty. Informational only (logged, not failed) —
  // 80px is a soft target from the council's original screenshot critique,
  // not a hard layout contract.
  const rootHeight = await page.locator('#root').evaluate(el => el.getBoundingClientRect().height).catch(() => null);
  const voidPx = rootHeight != null ? Math.max(0, SUPPORTED_HEIGHT - rootHeight) : null;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${width}px.png`);
  await page.screenshot({ path: file, fullPage: true });
  await browser.close();
  return { width, file, errors, voidPx };
}

(async () => {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.error('playwright is not installed. Run:\n'
      + '  npm install --save-dev playwright && npx playwright install chromium\n'
      + 'then re-run this script.');
    process.exit(1);
  }

  console.log(`=== IN-4 responsive capture — phone (interstitial): ${PHONE_WIDTHS.join(', ')}px`
    + ` | supported (game): ${SUPPORTED_WIDTHS.join(', ')}px ===\n`);
  let anyErrors = false;

  for (const w of PHONE_WIDTHS) {
    const result = await capturePhoneGate(chromium, w);
    const ok = result.errors.length === 0;
    if (!ok) anyErrors = true;
    console.log(`${ok ? '✓' : '✗'} ${w}px (interstitial) -> ${result.file}` + (ok ? '' : `\n  ${result.errors.join('\n  ')}`));
  }
  for (const w of SUPPORTED_WIDTHS) {
    const result = await captureWidth(chromium, w);
    const ok = result.errors.length === 0;
    if (!ok) anyErrors = true;
    const voidNote = result.voidPx != null ? ` (board-void: ${result.voidPx.toFixed(0)}px)` : '';
    console.log(`${ok ? '✓' : '✗'} ${w}px${voidNote} -> ${result.file}` + (ok ? '' : `\n  ${result.errors.join('\n  ')}`));
  }
  console.log(`\nScreenshots written to ${OUT_DIR}/ — eyeball each one for overlap/clipping`
    + ' (this script checks console errors and the phone-gate contract, not layout correctness by pixel).');
  process.exit(anyErrors ? 1 : 0);
})();
