// QB-A01 — input lifecycle regression check (the QB-P0-1 falsifier).
//
// THE DEFECT THIS PINS. quantum_chess.html registered `keydown` and nothing
// else. DUEL.onKey ends with `S.keys[k] = down`, so with keydown as its only
// caller `down` was structurally always true — no keyup, no blur and no
// visibility loss could ever write false. Hold a movement key, let go, and
// step() went on reading it as held: the ship accelerated forever. The
// visibilitychange listener that already existed only restarted the
// background rAF chain and touched no input state at all.
//
// Three independent checks, one Chromium page each:
//   1. keyup      — releasing the key must stop the acceleration.
//   2. blur       — a key released while the window is unfocused never
//                   delivers its keyup to this document; focus loss must
//                   drop the held state anyway.
//   3. tab hidden — the same latch reached through visibilitychange.
//
// HOW EACH CHECK AVOIDS BEING VACUOUS (QB-A02's standard, applied here):
//   · It enters the duel through the hub button a player actually clicks,
//     and asserts MODE === 'duel' before measuring. A check that silently
//     never entered the mode proves nothing.
//   · It first asserts the held key IS driving the ship (|v| > MIN_HELD_SPD).
//     Without that, "the ship isn't accelerating" would also pass on a page
//     where the key never registered in the first place.
//   · Every "no longer accelerating" assertion is guarded by a frame-progress
//     assertion — DUEL.state.t must really have advanced over the observation
//     window — so a stalled rAF chain fails the check instead of passing it.
//
// The ship's velocity is written in exactly three places (the key-driven
// accel, the speed cap, and the wall bounce), so zeroing vx/vy and watching
// for drift isolates the accel term precisely: with the keys correctly
// cleared the friction term multiplies zero and the reading stays exactly 0.
//
// Run: node tests/input_lifecycle_check.js
'use strict';
const watchPageErrors = require('./support/page_errors');
const path = require('path');

const GAME_URL = 'file://' + path.join(__dirname, '..', 'quantum_chess.html');

// The canonical hub control for Photon Duel (see openMenu() in the game).
const HUB_DUEL_BUTTON = '#modal-content button:has-text("PHOTON DUEL")';

const HELD_MS      = 300;   // long enough for the accel ramp to be unmistakable
const OBSERVE_MS   = 400;   // ~24 frames at 60Hz
const MIN_HELD_SPD = 40;    // px/s — terminal speed under a held key is ~172
const STILL_EPS    = 1;     // px/s — with no accel term this should be exactly 0
const MIN_SIM_ADV  = 0.15;  // s of sim time that must elapse inside OBSERVE_MS

const pageErrors = [];

// Enter Photon Duel the way a player does, and prove we got there.
async function enterDuel(page) {
  await page.goto(GAME_URL, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.mouse.click(10, 10).catch(() => {});          // skip the boot screen
  await page.waitForTimeout(200);
  if (await page.locator('#boot').isVisible().catch(() => false)) {
    await page.locator('#boot').click({ timeout: 3000 }).catch(() => {});
  }
  // finishBoot() opens the hub ~200ms later; no swallowed failure here —
  // if the control is gone, this throws and the check reports it.
  await page.locator(HUB_DUEL_BUTTON).waitFor({ state: 'visible', timeout: 8000 });
  await page.locator(HUB_DUEL_BUTTON).click({ timeout: 5000 });
  await page.waitForFunction(
    () => typeof MODE !== 'undefined' && MODE === 'duel' && DUEL.state.active === true,
    { timeout: 5000 },
  );
  // Entering from the menu shows the brief card first (the sim is held);
  // a player starts the round with ENTER, so this does the same.
  if (await page.evaluate(() => DUEL.state.briefing === true)) {
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => DUEL.state.briefing === false, { timeout: 3000 });
  }
}

// Hold `key`, confirm it really is driving the ship, run `release` (a keyup,
// a blur, a tab hide), then confirm the acceleration stopped.
async function heldThenReleased(page, key, axis, release) {
  await page.keyboard.down(key);
  await page.waitForTimeout(HELD_MS);
  // A slow software-rendered browser needs longer to ramp up. A key that truly
  // does nothing still fails: the wait ends and heldSpd is reported below MIN.
  await page.waitForFunction(([a, min]) => Math.abs(DUEL.state.ships[0][a]) > min,
    [axis, MIN_HELD_SPD], { timeout: 5000 }).catch(() => {});
  const heldSpd = await page.evaluate(a => Math.abs(DUEL.state.ships[0][a]), axis);

  await release();

  const flagCleared = await page.evaluate(k => DUEL.state.keys[k] === false, key.toLowerCase());

  // Zero the velocity so friction has nothing to decay: from here, any
  // movement at all is the accel term, i.e. a key still being read as held.
  const t0 = await page.evaluate(() => {
    DUEL.state.ships[0].vx = 0;
    DUEL.state.ships[0].vy = 0;
    return DUEL.state.t;
  });
  await page.waitForTimeout(OBSERVE_MS);
  const after = await page.evaluate(a => ({
    spd: Math.abs(DUEL.state.ships[0][a]),
    t: DUEL.state.t,
  }), axis);

  return { heldSpd, flagCleared, drift: after.spd, simAdvance: after.t - t0 };
}

function verdict(name, r) {
  const framesRan = r.simAdvance >= MIN_SIM_ADV;
  const wasMoving = r.heldSpd > MIN_HELD_SPD;
  const stopped   = r.drift < STILL_EPS;
  return {
    name,
    pass: framesRan && wasMoving && r.flagCleared && stopped,
    detail: `held |v|=${r.heldSpd.toFixed(1)}px/s (need >${MIN_HELD_SPD}) | `
      + `S.keys cleared=${r.flagCleared} | `
      + `drift after release=${r.drift.toFixed(3)}px/s (need <${STILL_EPS}) | `
      + `sim advanced ${r.simAdvance.toFixed(3)}s in ${OBSERVE_MS}ms (need >=${MIN_SIM_ADV})`,
  };
}

async function runCheck(chromium, name, key, axis, makeRelease) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  watchPageErrors(page, pageErrors);
  try {
    await enterDuel(page);
    const r = await heldThenReleased(page, key, axis, makeRelease(page, key));
    return verdict(name, r);
  } catch (e) {
    return { name, pass: false, detail: `check could not run: ${e.message}` };
  } finally {
    await browser.close();
  }
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

  console.log('=== QB-A01 input lifecycle checks (keyup / blur / tab hide) ===\n');

  const results = [
    // 1. keyup — the plain case.
    await runCheck(chromium, 'QB-A01a keyup releases a held movement key',
      'd', 'vx', (page, key) => () => page.keyboard.up(key)),

    // 2. blur — the key is NEVER released; focus loss has to do it. A real
    //    alt-tab delivers the keyup to the other window, not to this one,
    //    which is exactly why the synthetic event is the faithful model.
    await runCheck(chromium, 'QB-A01b focus loss clears a still-held key',
      'w', 'vy', page => () => page.evaluate(() => window.dispatchEvent(new Event('blur')))),

    // 3. tab hidden — same latch, reached through visibilitychange. The
    //    document.hidden override is the idiom live_regression_check.js
    //    already uses for BE-3.
    await runCheck(chromium, 'QB-A01c tab hide clears a still-held key',
      'a', 'vx', page => () => page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      })),
  ];

  results.push({ name: 'no uncaught page errors', pass: pageErrors.length === 0, detail: pageErrors.join(' | ') || 'none' });
  let anyFail = false;
  for (const r of results) {
    if (!r.pass) anyFail = true;
    console.log(`${r.pass ? '✓' : '✗'} ${r.name}\n  ${r.detail}`);
  }
  console.log(`\n${anyFail ? 'FAIL' : 'ALL CHECKS PASSED ✓'}`);
  process.exit(anyFail ? 1 : 0);
})();
