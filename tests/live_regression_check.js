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
//   (FE-3 and FE-11 retired with the board — see the note by their old
//    definitions below.)
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
    await page.evaluate(() => startDuel(7));
    await page.waitForTimeout(600);

    const dims = await page.evaluate(() => {
      const c = document.getElementById('game-canvas');
      const rect = c.getBoundingClientRect();
      return { canvasWidth: c.width, rectWidth: rect.width, dpr: window.devicePixelRatio };
    });
    const deliveredDensity = dims.canvasWidth / dims.rectWidth;
    const crispOk = deliveredDensity >= dims.dpr - 0.01;

    // Pointer reach: hold on the canvas must start a charge. The duel's
    // mousedown/mouseup registrations were lost once during the board's
    // removal and only a live playthrough noticed — this pins them.
    const canvas = await page.$('#game-canvas');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.waitForTimeout(220);
    await page.waitForFunction(() => DUEL.state.charging === true, null, { timeout: 5000 }).catch(() => {});
    const charging = await page.evaluate(() => DUEL.state.charging === true);
    await page.mouse.up();
    await page.waitForFunction(() => DUEL.state.shotCount > 0, null, { timeout: 5000 }).catch(() => {});
    const fired = await page.evaluate(() => DUEL.state.shotCount > 0);
    const clickOk = charging && fired;

    await browser.close();
    return { dpr, deliveredDensity, crispOk, clickOk };
  }

  const r1 = await checkOne(1);
  const r2 = await checkOne(2);
  const pass = r1.crispOk && r1.clickOk && r2.crispOk && r2.clickOk;
  return {
    name: 'FE-2 DPR crispness + duel pointer reach (dpr 1 & 2)',
    pass,
    detail: `dpr1: density=${r1.deliveredDensity.toFixed(2)} crisp=${r1.crispOk} charge+fire=${r1.clickOk} | `
      + `dpr2: density=${r2.deliveredDensity.toFixed(2)} crisp=${r2.crispOk} charge+fire=${r2.clickOk}`,
  };
}

// FE-3 (click-during-bot-turn feedback) and FE-11 (log dedupe + sage-bar
// scroll) were removed with the turn-based board on 2026-07-27: there is no
// bot turn to click through and no event log or sage bar to scroll. Their
// display-contract lesson lives on in FE-2's pointer-reach assertion above.

// BE-3 — animateBg() used to be a second, permanent rAF loop with no
// pause/reduced-motion handling at all. Two independently measurable claims:
// (a) reduced motion means exactly one frame, ever — bgParts stop moving;
// (b) a hidden tab drops the rAF chain entirely and resumes on visible.
async function checkBgReducedMotionAndVisibility(chromium) {
  const browser = await chromium.launch();

  // Both sub-checks need nothing covering the background: startMatch() only
  // clears the boot screen, but finishBoot() opens the mode-select modal
  // ~200ms later (bgCovered() correctly idles the draw path under either) —
  // so close it via closeModal() below.
  //
  // QB-A02 (2026-08-22): this comment used to say the modal was dismissed by
  // clicking "PLAY vs BOT", a control that retired with the board on
  // 2026-07-27. The CODE was already correct — it calls closeModal() — so
  // only the comment was stale. Recorded rather than silently deleted,
  // because a comment naming a control that no longer exists is how a reader
  // concludes the suite still tests the old product.
  async function clearToBoard(p) {
    await startMatch(p);
    // The hub modal opens ~200ms after boot and bgCovered() correctly idles
    // the background draw while it is up — close it so the loop is live.
    await p.evaluate(() => { try { closeModal(); } catch (e) {} });
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

  console.log('=== Live regression checks (FE-1/FE-2/BE-3) ===\n');
  const results = [
    await checkFrameTiming(chromium),
    await checkDprAndClick(chromium),
    await checkBgReducedMotionAndVisibility(chromium),
  ];
  let anyFail = false;
  for (const r of results) {
    if (!r.pass) anyFail = true;
    console.log(`${r.pass ? '✓' : '✗'} ${r.name}\n  ${r.detail}`);
  }
  process.exit(anyFail ? 1 : 0);
})();
