// IN-4 — scripted responsive regression capture. Loads the standalone
// quantum_chess.html directly (file://, no server needed — the game is
// fully self-contained), starts a vs-Bot match, makes one real move to
// populate the side panels and gate menu, and screenshots the result at
// each width in WIDTHS below. Flags any console error/pageerror per width.
//
// HANDOFF's IN-4 asked for 640/768/1024/1440px. 390px is added here: a
// C03 pass (IN-1) found the on-canvas gate-menu touch targets were ~15 CSS
// px tall at 390px-wide viewports (well under the 44px minimum) before
// being fixed — 640px alone would have missed that regression class
// entirely, so a true phone width belongs in the standing regression set.
//
// Requires the `playwright` package (not a repo dependency — install it
// ad hoc: `npm install --no-save playwright && npx playwright install
// chromium`, run this script, then `rm -rf node_modules` when done, so a
// heavy, rarely-needed browser toolchain doesn't sit in every checkout).
//
// Run: node tests/capture_responsive.js
'use strict';
const path = require('path');
const fs = require('fs');

const WIDTHS = [390, 640, 768, 1024, 1440];
const OUT_DIR = path.join(__dirname, '..', '_arena_screenshots');
const GAME_URL = 'file://' + path.join(__dirname, '..', 'quantum_chess.html');

async function captureWidth(chromium, width) {
  const browser = await chromium.launch();
  const isPhoneWidth = width < 500;
  const ctx = await browser.newContext({
    viewport: { width, height: Math.round(width * 1.6) },
    hasTouch: isPhoneWidth,
    isMobile: isPhoneWidth,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(GAME_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  // Skip the boot screen via click (works for both mouse-only and touch users).
  await page.mouse.click(10, 10).catch(() => {});
  await page.waitForTimeout(300);
  const playBtn = page.locator('button:has-text("PLAY vs BOT")');
  if (await playBtn.count() === 0) {
    await page.locator('#boot').click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await playBtn.click({ timeout: 5000 }).catch(e => errors.push('could not start match: ' + e.message));
  await page.waitForTimeout(500);

  // Select + move a white unit so the side panels and gate menu have real
  // content in the screenshot, not placeholder dashes.
  const canvas = await page.$('#game-canvas');
  if (canvas) {
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width * 0.18, box.y + box.height * 0.94);
    await page.waitForTimeout(200);
    await page.mouse.click(box.x + box.width * 0.18, box.y + box.height * 0.72);
    await page.waitForTimeout(400);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${width}px.png`);
  await page.screenshot({ path: file, fullPage: true });
  await browser.close();
  return { width, file, errors };
}

(async () => {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.error('playwright is not installed. Run:\n'
      + '  npm install --no-save playwright && npx playwright install chromium\n'
      + 'then re-run this script.');
    process.exit(1);
  }

  console.log(`=== IN-4 responsive capture — widths: ${WIDTHS.join(', ')}px ===\n`);
  let anyErrors = false;
  for (const w of WIDTHS) {
    const result = await captureWidth(chromium, w);
    const ok = result.errors.length === 0;
    if (!ok) anyErrors = true;
    console.log(`${ok ? '✓' : '✗'} ${w}px -> ${result.file}` + (ok ? '' : `\n  ${result.errors.join('\n  ')}`));
  }
  console.log(`\nScreenshots written to ${OUT_DIR}/ — eyeball each one for overlap/clipping`
    + ' (this script checks console errors, not layout correctness by pixel).');
  process.exit(anyErrors ? 1 : 0);
})();
