// FE-14a (+ ad hoc live guards for FE-2/FE-3) — Playwright-driven checks that
// were noted in HANDOFF.md as "not verified live" once FE-1/FE-2/FE-3 landed
// (no Playwright was installed in that environment at the time). Playwright
// became a permanent devDependency 2026-07-08 (see CLAUDE.md), so these now
// run for real instead of relying on the Node-side math simulation FE-1's
// original note describes.
//
// Three independent checks, one Chromium launch each:
//   1. FE-1 timing equivalence — stub requestAnimationFrame with a fully
//      synthetic timeline (no real-clock reads inside the measured window,
//      so IPC/wall-clock jitter can't leak in) and confirm the animation
//      phase (_t) advances the same amount over an equal span of simulated
//      wall-clock time at 30Hz/60Hz/120Hz-equivalent cadences.
//   2. FE-2 DPR crispness + click accuracy — launch at deviceScaleFactor 1
//      and 2, confirm the canvas backing store's delivered pixel density
//      meets or exceeds the target DPR (by design the backing store is
//      fixed at BOARD*DPR, not rect.width*DPR, so it's always >= target,
//      never blurrier), and confirm a click still selects the correct unit
//      at both densities (guards the canvas.width -> BOARD regression trap
//      called out in FE-2's own task text).
//   3. FE-3 click-during-bot-turn feedback — force GAME.turn to the bot's
//      color, click the board, and confirm a floating "bot is acting…" cue
//      appears in GAME.floats well under the 100ms done-when.
//   4. FE-11 log dedupe + sage-bar scroll — run resetGame() twice (as a
//      normal session does: finishBoot()'s eager default match, then the
//      player's own mode pick) and confirm "Battle start" appears exactly
//      once in #log; confirm #sage-bar-text is scrollable, not silently
//      clipped, once its content overflows the fixed-height bar.
//
// Run: node tests/live_regression_check.js
'use strict';
const path = require('path');

const GAME_URL = 'file://' + path.join(__dirname, '..', 'quantum_chess.html');

async function startMatch(page) {
  await page.goto(GAME_URL, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.mouse.click(10, 10).catch(() => {});
  await page.waitForTimeout(200);
}

async function checkFrameTiming(chromium) {
  async function runAtCadence(hz) {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => {
      window.__rafCallbacks = new Map();
      window.__rafId = 0;
      window.requestAnimationFrame = (cb) => {
        const id = ++window.__rafId;
        window.__rafCallbacks.set(id, cb);
        return id;
      };
      window.cancelAnimationFrame = (id) => { window.__rafCallbacks.delete(id); };
      window.__pumpFrames = (startTs, intervalMs, count) => {
        let ts = startTs;
        for (let i = 0; i < count; i++) {
          const cbs = Array.from(window.__rafCallbacks.values());
          window.__rafCallbacks.clear();
          for (const cb of cbs) { try { cb(ts); } catch (e) { /* ignore */ } }
          ts += intervalMs;
        }
        return ts;
      };
    });
    await startMatch(page);

    const intervalMs = 1000 / hz;
    const count = Math.round(1000 / intervalMs); // simulate 1s of wall-clock
    const result = await page.evaluate(({ intervalMs, count }) => {
      let ts = 1000; // arbitrary synthetic anchor — never re-reads real time
      // Warm-up: burn the one frame that always hits the MS_PER_TICK
      // fallback (post-boot _lastFrameTs is `undefined`, true in a real
      // browser too — a harmless one-time startup artifact) before it can
      // pollute the measured window.
      ts = window.__pumpFrames(ts, intervalMs, 1);
      const baseline = _t;
      ts = window.__pumpFrames(ts, intervalMs, count);
      return { tDelta: _t - baseline };
    }, { intervalMs, count });
    await browser.close();
    return result.tDelta;
  }

  const d30 = await runAtCadence(30);
  const d60 = await runAtCadence(60);
  const d120 = await runAtCadence(120);
  const pct30 = Math.abs(d60 - d30) / d60 * 100;
  const pct120 = Math.abs(d60 - d120) / d60 * 100;
  const pass = pct30 < 1 && pct120 < 1;
  return {
    name: 'FE-1 timing equivalence (30/60/120Hz)',
    pass,
    detail: `_t delta over 1s sim: 30Hz=${d30.toFixed(3)} 60Hz=${d60.toFixed(3)} 120Hz=${d120.toFixed(3)} `
      + `(diff vs 60Hz: ${pct30.toFixed(4)}% / ${pct120.toFixed(4)}%)`,
  };
}

async function checkDprAndClick(chromium) {
  async function checkOne(dpr) {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    await startMatch(page);
    const playBtn = page.locator('button:has-text("PLAY vs BOT")');
    await playBtn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    const dims = await page.evaluate(() => {
      const c = document.getElementById('game-canvas');
      const rect = c.getBoundingClientRect();
      return { canvasWidth: c.width, rectWidth: rect.width, dpr: window.devicePixelRatio };
    });
    const deliveredDensity = dims.canvasWidth / dims.rectWidth;
    const crispOk = deliveredDensity >= dims.dpr - 0.01;

    const canvas = await page.$('#game-canvas');
    const box = await canvas.boundingBox();
    const before = await page.evaluate(() => (typeof GAME !== 'undefined' && GAME.selected) ? (GAME.selected.row + ',' + GAME.selected.col) : null);
    await page.mouse.click(box.x + box.width * 0.18, box.y + box.height * 0.94);
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => (typeof GAME !== 'undefined' && GAME.selected) ? (GAME.selected.row + ',' + GAME.selected.col) : null);
    const clickOk = before !== after;

    await browser.close();
    return { dpr, deliveredDensity, crispOk, clickOk };
  }

  const r1 = await checkOne(1);
  const r2 = await checkOne(2);
  const pass = r1.crispOk && r1.clickOk && r2.crispOk && r2.clickOk;
  return {
    name: 'FE-2 DPR crispness + click accuracy (dpr 1 & 2)',
    pass,
    detail: `dpr1: density=${r1.deliveredDensity.toFixed(2)} crisp=${r1.crispOk} click=${r1.clickOk} | `
      + `dpr2: density=${r2.deliveredDensity.toFixed(2)} crisp=${r2.crispOk} click=${r2.clickOk}`,
  };
}

async function checkClickFeedbackFloor(chromium) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await startMatch(page);
  const playBtn = page.locator('button:has-text("PLAY vs BOT")');
  await playBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    GAME.mode = 'vsBot';
    GAME.turn = GAME.botColor;
    GAME.floats = GAME.floats || [];
  });
  const canvas = await page.$('#game-canvas');
  const box = await canvas.boundingBox();
  const t0 = Date.now();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  const floats = await page.evaluate(() => GAME.floats.map(f => f.text));
  const elapsedMs = Date.now() - t0;
  const gotFeedback = floats.some(t => /bot is acting/i.test(t));
  await browser.close();
  return {
    name: 'FE-3 click-during-bot-turn feedback (<100ms)',
    pass: gotFeedback && elapsedMs < 100,
    detail: `feedback shown=${gotFeedback}, elapsed=${elapsedMs}ms`,
  };
}

// FE-11 — two independent bugs found in screenshot captures: (a) resetGame()
// runs at least twice in a normal session (finishBoot() eagerly starts a
// default vsBot match, then the mode-select menu's "PLAY vs BOT" calls it
// again for real) but never cleared the #log DOM, so the "Battle start" line
// appeared twice; (b) #sage-bar-text was `overflow:hidden` with no scroll/
// ellipsis, so a message longer than the fixed-height bar was silently cut
// off mid-sentence. Both fixed by: clearing #log's children at the top of
// resetGame(), and switching #sage-bar-text to overflow-y:auto (+min-height:0,
// required for a flex:1 child to actually shrink and let overflow trigger).
async function checkLogDedupeAndSageScroll(chromium) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await startMatch(page); // finishBoot() already ran resetGame('vsBot') once
  const playBtn = page.locator('button:has-text("PLAY vs BOT")');
  await playBtn.click({ timeout: 5000 }).catch(() => {}); // resetGame('vsBot') again
  await page.waitForTimeout(300);

  const battleStartCount = await page.evaluate(() =>
    Array.from(document.getElementById('log').children)
      .filter(el => /Battle start/.test(el.textContent)).length
  );

  const sageCheck = await page.evaluate(() => {
    const el = document.getElementById('sage-bar-text');
    el.textContent = 'A very long sage message that must not be silently clipped mid-sentence. '.repeat(6);
    const cs = getComputedStyle(el);
    return {
      overflowY: cs.overflowY,
      overflows: el.scrollHeight > el.clientHeight,
      textIntact: el.textContent.startsWith('A very long sage message'),
    };
  });

  await browser.close();
  const pass = battleStartCount === 1 && sageCheck.overflowY !== 'hidden' && sageCheck.overflows && sageCheck.textIntact;
  return {
    name: 'FE-11 log dedupe + sage-bar scroll (not clip)',
    pass,
    detail: `"Battle start" lines after 2x resetGame()=${battleStartCount} (want 1) | `
      + `sage-bar-text overflow-y=${sageCheck.overflowY} overflows=${sageCheck.overflows} textIntact=${sageCheck.textIntact}`,
  };
}

// BE-3 — animateBg() used to be a second, permanent rAF loop with no
// pause/reduced-motion handling at all. Two independently measurable claims:
// (a) reduced motion means exactly one frame, ever — bgParts stop moving;
// (b) a hidden tab drops the rAF chain entirely and resumes on visible.
async function checkBgReducedMotionAndVisibility(chromium) {
  const browser = await chromium.launch();

  // Both sub-checks need nothing covering the background: startMatch() only
  // clears the boot screen, but finishBoot() opens the mode-select modal
  // ~200ms later (bgCovered() correctly idles the draw path under either) —
  // click "PLAY vs BOT" to close it, same as the other checks in this file.
  async function clearToBoard(p) {
    await startMatch(p);
    const playBtn = p.locator('button:has-text("PLAY vs BOT")');
    await playBtn.click({ timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(300);
  }

  // (a) reduced motion — page context option, applies before any script runs.
  const rmCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const rmPage = await rmCtx.newPage();
  await clearToBoard(rmPage);
  const xBefore = await rmPage.evaluate(() => bgParts[0].x);
  await rmPage.waitForTimeout(800);
  const xAfter = await rmPage.evaluate(() => bgParts[0].x);
  const reducedMotionStatic = xBefore === xAfter;
  await rmCtx.close();

  // (b) hidden tab pause + resume — normal motion, so any drift proves the
  // loop is genuinely running/stopping, not just permanently idle already.
  const browser2Ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await browser2Ctx.newPage();
  await clearToBoard(page);

  const setHidden = (hidden) => page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { value: h, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

  await setHidden(true);
  const xHidden1 = await page.evaluate(() => bgParts[0].x);
  await page.waitForTimeout(600);
  const xHidden2 = await page.evaluate(() => bgParts[0].x);
  const pausedWhileHidden = xHidden1 === xHidden2;

  await setHidden(false);
  const xResume1 = await page.evaluate(() => bgParts[0].x);
  await page.waitForTimeout(600);
  const xResume2 = await page.evaluate(() => bgParts[0].x);
  const resumedWhenVisible = xResume1 !== xResume2;

  await browser.close();
  const pass = reducedMotionStatic && pausedWhileHidden && resumedWhenVisible;
  return {
    name: 'BE-3 background: reduced-motion static frame + hidden-tab pause/resume',
    pass,
    detail: `reducedMotionStatic=${reducedMotionStatic} (x ${xBefore}->${xAfter}) | `
      + `pausedWhileHidden=${pausedWhileHidden} (x ${xHidden1}->${xHidden2}) | `
      + `resumedWhenVisible=${resumedWhenVisible} (x ${xResume1}->${xResume2})`,
  };
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

  console.log('=== Live regression checks (FE-1/FE-2/FE-3/FE-11/BE-3) ===\n');
  const results = [
    await checkFrameTiming(chromium),
    await checkDprAndClick(chromium),
    await checkClickFeedbackFloor(chromium),
    await checkLogDedupeAndSageScroll(chromium),
    await checkBgReducedMotionAndVisibility(chromium),
  ];
  let anyFail = false;
  for (const r of results) {
    if (!r.pass) anyFail = true;
    console.log(`${r.pass ? '✓' : '✗'} ${r.name}\n  ${r.detail}`);
  }
  process.exit(anyFail ? 1 : 0);
})();
