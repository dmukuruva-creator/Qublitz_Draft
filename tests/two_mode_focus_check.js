// C02-T1..T4 — focused product contract:
// exactly two play modes, durable training progress, correct next-mission
// flow, and reduced-motion-safe presentation effects.
'use strict';

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
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const hub = await page.evaluate(() => ({
    modes: [...document.querySelectorAll('[data-play-mode]')].map(el => ({
      id: el.dataset.playMode, text: el.textContent.replace(/\s+/g, ' ').trim(),
    })),
    removedFunctions: [typeof window.startBellTrial, typeof window.startEchoSiege],
    removedCopy: /BELL TRIAL|ECHO SIEGE/.test(document.body.textContent),
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
      && reducedFx.cardTransition.split(',').every(v => v.trim() === '0s'), JSON.stringify(reducedFx));
  await reduced.close();

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
