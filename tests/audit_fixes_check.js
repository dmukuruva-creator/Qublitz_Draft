// C05 — pins every fix from the 2026-11-05 live-site audit (PRESSURE_TEST_2026-11-05.md).
// Each check drives production code under a manual clock; none re-implements the rule it tests.
'use strict';
const watchPageErrors = require('./support/page_errors');
const path = require('path');
const { chromium } = require('playwright');

const GAME_PATH = process.env.QUBLITZ_GAME_PATH || path.join(__dirname, '..', 'quantum_chess.html');
const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass: !!pass });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? `\n      ${detail}` : ''}`);
}

const manualClock = () => {
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = f => window.__manual ? 0 : raf(f);
};
const lib = () => {
  window.key = (k, d) => DUEL.onKey({ key: k, repeat: false, preventDefault() {} }, d);
  window.tick = () => { window.__clock += 1000 / 60; DUEL.frame(window.__clock); };
  window.ticks = n => { for (let i = 0; i < n; i++) tick(); };
  window.startRound = (seed, m, o) => {
    window.__manual = true; startDuel(seed, m, o);
    window.__clock = performance.now(); DUEL.state.last = null; tick();
  };
  // Park Sage on the shot line, at |1⟩ with a draw that always hits.
  window.forceWin = () => {
    const S = DUEL.state; S.rand = () => 0.01;
    S.ships[1].x = S.ships[0].x + 80; S.ships[1].y = S.ships[0].y; S.ships[1].vx = S.ships[1].vy = 0;
    S.aim = { x: S.ships[1].x, y: S.ships[1].y };
    key(' ', true); key(' ', false);
    for (let f = 0; f < 600 && !S.over; f++) {
      S.ships[1].x = S.ships[0].x + 80; S.ships[1].y = S.ships[0].y; S.ships[1].bloch = { x: 0, y: 0, z: -1 };
      tick();
    }
  };
};

(async () => {
  console.log('=== C05 audit-fix checks ===\n');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(manualClock);
  const page = await ctx.newPage();
  const errors = [];
  watchPageErrors(page, errors);
  await page.goto('file://' + GAME_PATH, { waitUntil: 'load' });
  await page.evaluate(() => finishBoot());
  await page.waitForTimeout(300);
  await page.evaluate(lib);

  // R1: a first 3-star clear saves its own stars, not the previous round's.
  const r1 = await page.evaluate(() => {
    GAME.duelProfile = DuelProgress.blank();
    startRound(1, 1); const S = DUEL.state; S.briefing = false; S.introT = 0; S.missionStars = 0;
    forceWin();
    return { over: S.over, shown: S.missionStars, saved: (GAME.duelProfile.missions[1] || {}).bestStars || 0 };
  });
  check('R1 a cleared mission saves the stars it shows', r1.over && r1.shown > 0 && r1.saved === r1.shown, JSON.stringify(r1));

  // R2: the linked coach quotes the real P(1), never a fixed "safe 50%".
  const r2 = await page.evaluate(() => {
    const P = DuelCore.Pair, th = 2 * Math.asin(Math.sqrt(0.2));
    startRound(3); const S = DUEL.state; S.introT = 0;
    S.bell = P.cnot(P.fromBloch({ x: Math.sin(th), y: 0, z: Math.cos(th) }, { x: 0, y: 0, z: 1 }), 0);
    S.ships[0].bellIdx = 0; S.ships[1].bellIdx = 1; tick();
    return { hint: DUEL.coachHint()[0], p: Math.round(DuelCore.odds(S.ships[1].bloch) * 100) };
  });
  check('R2 linked coach states the real win chance', !/safe 50%/.test(r2.hint) && r2.hint.includes(`${r2.p}%`), JSON.stringify(r2));

  // R3: the charge preview against a Zeno-pinned target promises nothing.
  const r3 = await page.evaluate(() => {
    startRound(4); const S = DUEL.state; S.introT = 0;
    S.ships[1].zenoUntil = S.t + 99; S.ships[1].bloch = { x: 0, y: 0, z: 1 };
    S.beam = 'X'; S.charging = true; S.selfAim = false; S.chargeT = 1.2;
    const C = CanvasRenderingContext2D.prototype, ft = C.fillText, seen = [];
    C.fillText = function (t, ...a) { if (/RELEASE/.test(String(t))) seen.push(String(t)); return ft.call(this, t, ...a); };
    tick(); C.fillText = ft; S.charging = false;
    return seen[0] || '';
  });
  check('R3 charge preview honours a Zeno pin', /ZENO-PINNED/.test(r3) && !/0% → 100%/.test(r3), r3);

  // R4, R5: card copy matches the physics.
  const copy = await page.evaluate(() => ({ detune: DuelCore.PICKUPS.detune.effect, html: document.documentElement.outerHTML }));
  check('R4 detune copy limits the 20% claim to one beam', /one beam from \|0⟩ lifts you to 20% at most/.test(copy.detune), copy.detune);
  check('R5 CNOT card gives the general rule', /p \+ q − 2pq/.test(copy.html) && !/their odds become 50%, whatever they were/.test(copy.html));

  // R6: Escape during a decided round's reveal cannot pause, so R cannot erase the loss.
  const r6 = await page.evaluate(() => {
    GAME.duelProfile = DuelProgress.blank(); startRound(5); const S = DUEL.state; S.introT = 0;
    S.rand = () => 0.01; S.ships[0].bloch = { x: 0, y: 0, z: -1 };
    for (let f = 0; f < 4000 && !S.pendingEnd; f++) {
      const foe = S.ships[1]; foe.x = S.ships[0].x + 60; foe.y = S.ships[0].y; foe.ang = Math.PI; foe.measCd = 0;
      if (!foe.winding) foe.winding = 0.2; S.ships[0].bloch = { x: 0, y: 0, z: -1 }; tick();
    }
    const pending = !!S.pendingEnd;
    key('Escape', true); key('Escape', false); const paused = S.paused;
    key('r', true); key('r', false); ticks(150);
    return { pending, paused, them: S.match.them };
  });
  check('R6 a pending loss cannot be paused away', r6.pending && !r6.paused && r6.them === 1, JSON.stringify(r6));

  // R7: a link with no entanglement left no longer blocks E, and the CNOT acts on the real pair.
  const r7 = await page.evaluate(() => {
    const P = DuelCore.Pair; startRound(3); const S = DUEL.state; S.introT = 0;
    let rho = P.cnot(P.fromBloch({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }), 0);
    for (let i = 0; i < 400; i++) rho = P.decay(P.decay(rho, 0, { T1: 90, T2: 30, dt: 0.1 }), 1, { T1: 90, T2: 30, dt: 0.1 });
    S.bell = rho; S.ships[0].bellIdx = 0; S.ships[1].bellIdx = 1; S.ships[0].entCd = 0; tick();
    const spent = S.bell && S.pairNeg <= 0.05;
    S.ships[0].x = 300; S.ships[0].y = 300; S.ships[0].ang = 0;
    const launched = window.DUEL_launchEntangleForTest ? DUEL_launchEntangleForTest() : (key('e', true), key('e', false), S.ships[0].entCd > 0);
    return { spent: !!spent, launched };
  });
  check('R7 E fires again once the link holds no entanglement', r7.spent && r7.launched, JSON.stringify(r7));

  // R8: the SYNC countdown holds the sim.
  const r8 = await page.evaluate(() => {
    startRound(5); const S = DUEL.state; const t0 = S.t, intro = S.introT; ticks(60);
    return { intro, simTime: +(S.t - t0).toFixed(2), introLeft: +S.introT.toFixed(2) };
  });
  check('R8 nothing simulates during SYNC', r8.intro > 1 && r8.simTime === 0 && r8.introLeft > 0, JSON.stringify(r8));

  // R12: exports and round_end events record the assists.
  const r12 = await page.evaluate(() => {
    GAME.aimAssist = false; GAME.coach = true;
    const ex = buildGateLogExport();
    return { assists: ex.assists, v: ex.schemaVersion };
  });
  check('R12 export records aim assist and coach', r12.assists && r12.assists.aimAssist === false && r12.assists.coach === true, JSON.stringify(r12));

  // R13 + Q1 + Q4: hub controls.
  const hub = await page.evaluate(() => {
    window.__manual = false; DUEL.stop && DUEL.stop(); openMenu();
    localStorage.setItem('qublitz_training_progress_v1', '[0,1]'); GAME.duelDone = [0, 1];
    const btn = document.getElementById('reset-progress-btn');
    const first = btn && resetProgress(btn);
    const afterOne = localStorage.getItem('qublitz_training_progress_v1');
    const second = resetProgress(document.getElementById('reset-progress-btn'));
    const sel = document.getElementById('diff-sel');
    return {
      hasReset: !!btn, firstErased: !!first, afterOne, second, cleared: localStorage.getItem('qublitz_training_progress_v1'),
      done: GAME.duelDone.length, replay: !!document.getElementById('replay-concepts-btn'),
      selectLabelled: !!(sel && sel.labels && sel.labels.length),
      folded: document.querySelectorAll('#modal-content details.hub-ref:not([open])').length,
      scroll: document.getElementById('modal-content').scrollHeight,
    };
  });
  check('R13 reset needs a second click, then clears progress', hub.hasReset && !hub.firstErased && hub.afterOne === '[0,1]' && hub.second && hub.cleared === null && hub.done === 0, JSON.stringify(hub));
  check('R13 concept cards can be replayed', hub.replay);
  check('Q1 opponent select has a label', hub.selectLabelled);
  check('Q4 hub reference sections start folded', hub.folded === 3, `folded=${hub.folded} scroll=${hub.scroll}`);

  // T1, T2: no canvas label under 12 CSS px at 1366×768; mission steps wrap, not cut.
  const t1 = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas'); let min = 99; const steps = [];
    const C = CanvasRenderingContext2D.prototype, ft = C.fillText;
    C.fillText = function (t, ...a) {
      if (this.canvas === canvas && String(t).trim() && this.globalAlpha > 0.05) {
        const px = parseFloat((this.font.match(/(\d+(?:\.\d+)?)px/) || [])[1]);
        min = Math.min(min, px * this.getTransform().a * canvas.getBoundingClientRect().width / canvas.width);
        steps.push(String(t));
      }
      return ft.call(this, t, ...a);
    };
    for (const m of [-1, 5]) { startRound(7, m < 0 ? undefined : m); DUEL.state.briefing = false; DUEL.state.introT = 0; tick(); }
    C.fillText = ft;
    return { min: +min.toFixed(2), tail: steps.some(s => /near the top/.test(s)) };
  });
  check('T1 every canvas label is at least 12 CSS px at 1366×768', t1.min >= 11.95, `min=${t1.min}`);
  check('T2 mission 6 step 2 is shown in full', t1.tail);

  // T7: the boot layer is gone by the time the hub opens.
  const t7 = await page.evaluate(() => getComputedStyle(document.getElementById('boot')).display);
  check('T7 boot title does not show through the hub', t7 === 'none', t7);

  // Q3: canvas-only text reaches the screen-reader status region.
  const q3 = await page.evaluate(() => {
    startRound(7, 3, { brief: true }); tick();
    return document.getElementById('a11y-status').textContent;
  });
  check('Q3 mission brief is announced', /Mission 4/.test(q3) && /Step 1/.test(q3), q3.slice(0, 90));

  // Context restore keeps the canvas scale (found while measuring T1).
  const ctxr = await page.evaluate(() => {
    const c = document.getElementById('game-canvas'), g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); c.dispatchEvent(new Event('contextrestored'));
    return +g.getTransform().a.toFixed(3) === +(c.width / 800).toFixed(3);
  });
  check('a restored canvas context gets its scale back', ctxr);

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log(`\n${failed.length ? 'FAILED' : 'ALL CHECKS PASSED'} — ${results.length - failed.length}/${results.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
