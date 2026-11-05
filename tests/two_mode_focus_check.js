// C02-T1..T4 — focused product contract:
// exactly two play modes, durable training progress, correct next-mission
// flow, and reduced-motion-safe presentation effects.
'use strict';
const watchPageErrors = require('./support/page_errors');

const path = require('path');
const { chromium } = require('playwright');

const GAME_PATH = process.env.QUBLITZ_GAME_PATH || path.join(__dirname, '..', 'quantum_chess.html');
const GAME_URL = 'file://' + GAME_PATH;
const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? `\n      ${detail}` : ''}`);
}

async function openGame(context) {
  const page = await context.newPage();
  await page.goto(GAME_URL, { waitUntil: 'load' });
  await page.evaluate(() => finishBoot());
  await page.locator('#modal-overlay.show').waitFor({ state: 'visible', timeout: 5000 });
  return page;
}

(async () => {
  console.log('=== C02 two-mode focus checks ===\n');
  const browser = await chromium.launch();

  const normal = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await openGame(normal);
  const consoleErrors = [];
  watchPageErrors(page, consoleErrors);

  const hub = await page.evaluate(() => ({
    modes: [...document.querySelectorAll('[data-play-mode]')].map(el => ({
      id: el.dataset.playMode, text: el.textContent.replace(/\s+/g, ' ').trim(),
    })),
    removedFunctions: ['start' + 'BellTrial', 'start' + 'EchoSiege'].map(name => typeof window[name]),
    removedCopy: new RegExp([['BELL','TRIAL'].join(' '), ['ECHO','SIEGE'].join(' ')].join('|'))
      .test(document.body.textContent),
  }));
  check('hub exposes exactly Photon Duel and Duel Training',
    JSON.stringify(hub.modes.map(m => m.id)) === JSON.stringify(['photon-duel','duel-training']),
    hub.modes.map(m => m.id).join(', '));
  check('retired modes have no launcher or visible copy',
    hub.removedFunctions.every(v => v === 'undefined') && !hub.removedCopy,
    `functions=${hub.removedFunctions.join('/')} copy=${hub.removedCopy}`);

  const progress = await page.evaluate(() => {
    recordTrainingClear(0);
    recordTrainingClear(2);
    openDuelMissions();
    const nextCard = document.querySelector('.mission-card.is-next');
    const replay = document.querySelector('[data-training-mission="0"] button');
    return {
      saved: JSON.parse(localStorage.getItem(TRAINING_PROGRESS_KEY)),
      done: GAME.duelDone.slice(), next: nextTrainingMission(),
      ariaNow: document.querySelector('.training-progress').getAttribute('aria-valuenow'),
      nextCard: nextCard && +nextCard.dataset.trainingMission,
      replay: replay && replay.textContent.includes('REPLAY'),
    };
  });
  check('training progress is stored and the next uncleared mission is highlighted',
    JSON.stringify(progress.saved) === '[0,2]' && JSON.stringify(progress.done) === '[0,2]'
      && progress.next === 1 && progress.ariaNow === '2' && progress.nextCard === 1 && progress.replay,
    JSON.stringify(progress));

  await page.reload({ waitUntil: 'load' });
  const afterReload = await page.evaluate(() => ({ done: GAME.duelDone.slice(), next: nextTrainingMission() }));
  check('training progress survives reload',
    JSON.stringify(afterReload.done) === '[0,2]' && afterReload.next === 1,
    JSON.stringify(afterReload));

  const advance = await page.evaluate(() => {
    startDuel(42, 0);
    DUEL.state.over = true;
    DUEL.state.round.winner = 0;
    DUEL.onKey({ key:'Enter', preventDefault(){} }, true);
    return DUEL.state.mission;
  });
  check('post-clear Enter advances to the next uncleared mission', advance === 1, `mission=${advance}`);

  const normalFx = await page.evaluate(() => {
    DUEL.triggerFx('TEST IMPACT', '#ffffff', 0.6);
    return { reduce: REDUCE_MOTION, shake: DUEL.state.shake, flash: DUEL.state.flash,
             label: DUEL.state.announcer };
  });
  check('normal-motion impact feedback activates',
    !normalFx.reduce && normalFx.shake > 0 && normalFx.flash > 0 && normalFx.label === 'TEST IMPACT',
    JSON.stringify(normalFx));
  await normal.close();

  const reduced = await browser.newContext({
    viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce',
  });
  const reducedPage = await openGame(reduced);
  await reducedPage.hover('[data-play-mode="photon-duel"]');
  const reducedFx = await reducedPage.evaluate(() => {
    const cardStyle = getComputedStyle(document.querySelector('[data-play-mode="photon-duel"]'));
    startDuel(42, 0);
    DUEL.triggerFx('TEST IMPACT', '#ffffff', 0.6);
    return { reduce: REDUCE_MOTION, shake: DUEL.state.shake, flash: DUEL.state.flash,
             label: DUEL.state.announcer, cardTransform: cardStyle.transform,
             cardTransition: cardStyle.transitionDuration };
  });
  check('reduced motion keeps the text cue but removes canvas and hub motion',
    reducedFx.reduce && reducedFx.shake === 0 && reducedFx.flash === 0
      && reducedFx.label === 'TEST IMPACT' && reducedFx.cardTransform === 'none'
      && reducedFx.cardTransition.split(',').every(v => parseFloat(v) <= 0.001), JSON.stringify(reducedFx));
  await reduced.close();

  // Everything above calls startDuel()/openDuelMissions() directly, so a dead
  // hub button would pass. These go through the button a player actually clicks.
  const clicks = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const watch = p => watchPageErrors(p, consoleErrors);
  const duelClickPage = await openGame(clicks);
  watch(duelClickPage);
  await duelClickPage.click('[data-play-mode="photon-duel"]');
  const clickedDuel = await duelClickPage.evaluate(() => ({
    duelMode: document.body.classList.contains('duel-mode'),
    modalOpen: !!document.querySelector('#modal-overlay.show'),
  }));
  check('clicking the Photon Duel card starts a duel',
    clickedDuel.duelMode && !clickedDuel.modalOpen, JSON.stringify(clickedDuel));
  // Measures the text the HUD really draws, in the states that add or move labels.
  const hudStates = {
    default: () => {},
    charging: () => { DUEL.state.charging = true; DUEL.state.chargeT = 0.5; },
    'entangle cooldown': () => { DUEL.state.ships[0].entCd = 12; },
    // The state a landed E shot builds: a CNOT from |+> onto |0>.
    'bell link': () => {
      const s = DUEL.state, Pair = DuelCore.Pair;
      s.bell = Pair.cnot(Pair.fromBloch({ x:1, y:0, z:0 }, { x:0, y:0, z:1 }), 0);
      s.ships[0].bellIdx = 0; s.ships[1].bellIdx = 1;
    },
    'gamepad + T beam': () => {
      const buttons = Array(17).fill({ value:0, pressed:false });
      DUEL.setGamepadProvider(() => [{ id:'x', index:0, connected:true, mapping:'standard', axes:[0,0,0,0], buttons }]);
      DUEL.state.beam = 'T';
    },
    hotspot: () => { DUEL.state.ships[0].inHot = true; },
  };
  for (const [state, setup] of Object.entries(hudStates)) {
    await duelClickPage.evaluate(() => { DUEL.setGamepadProvider(() => []); startDuel(7); });
    await duelClickPage.evaluate(setup);
    const drawn = await duelClickPage.evaluate(() => new Promise(resolve => {
      const P = CanvasRenderingContext2D.prototype, fillText = P.fillText, rows = [];
      P.fillText = function (text, x, y, ...rest) {
        if (this.canvas.id === 'game-canvas' && y > 650) {
          const w = this.measureText(text).width;
          const left = this.textAlign === 'center' ? x - w / 2 : this.textAlign === 'right' ? x - w : x;
          rows.push({ text, left, right: left + w, top: y - 10, bottom: y + 3 });
        }
        return fillText.call(this, text, x, y, ...rest);
      };
      // Exactly one game frame runs between two consecutive animation frames.
      requestAnimationFrame(() => {
        rows.length = 0;
        requestAnimationFrame(() => {
          P.fillText = fillText;
          const overlaps = [];
          rows.forEach((a, i) => rows.slice(i + 1).forEach(b => {
            if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
              && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps.push(`${a.text} × ${b.text}`);
          }));
          resolve({
            count: rows.length, overlaps,
            linked: !!DUEL.state.bell,
            clipped: rows.filter(r => r.left < 0 || r.right > BOARD).map(r => r.text),
            hasBarEnd: rows.some(r => r.text === 'π'),
            hasStrip: rows.some(r => r.text.startsWith('ACTIVE INPUT')),
          });
        });
      });
    }));
    check(`HUD text does not overlap or clip: ${state}`,
      (state !== 'bell link' || drawn.linked) && drawn.count >= 8 && drawn.hasBarEnd && drawn.hasStrip && !drawn.overlaps.length && !drawn.clipped.length,
      JSON.stringify(drawn));
  }

  const trainingClickPage = await openGame(clicks);
  watch(trainingClickPage);
  await trainingClickPage.click('[data-play-mode="duel-training"]');
  const clickedTraining = await trainingClickPage.evaluate(() => ({
    progress: !!document.querySelector('#modal-content .training-progress'),
    hubGone: !document.querySelector('[data-play-mode]'),
  }));
  check('clicking the Duel Training card opens the mission list',
    clickedTraining.progress && clickedTraining.hubGone, JSON.stringify(clickedTraining));
  await clicks.close();

  check('focused flow produces no console errors', consoleErrors.length === 0,
    consoleErrors.join(' | ') || 'clean');
  await browser.close();

  const failed = results.filter(r => !r.pass);
  console.log(`\n${failed.length ? 'FAILED' : 'ALL CHECKS PASSED'} — ${results.length - failed.length}/${results.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
