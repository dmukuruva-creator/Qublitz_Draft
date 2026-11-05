// C03-T1..T5 — records, mastery, keyboard-only combat, and virtual standard-gamepad I/O.
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

async function boot(page) {
  await page.goto(GAME_URL, { waitUntil:'load' });
  await page.evaluate(() => finishBoot());
  await page.locator('#modal-overlay.show').waitFor({ state:'visible', timeout:5000 });
}

// Keep the already fixture-positioned target on the shot line while advancing
// the production fixed-step simulation. Wall-clock sleeps previously raced the
// one-second wind-up: by the time the target was moved, the projectile could
// already have passed it. This controls geometry/time only; firing, collision,
// quantum resolution, win gating and badge persistence remain production code.
async function finishMeasureFixture(page) {
  await page.evaluate(() => {
    const s = DUEL.state;
    let ts = s.last == null ? performance.now() : s.last;
    for (let i = 0; i < 120 && !s.over; i++) {
      const me = s.ships[0], foe = s.ships[1];
      foe.x = me.x + 45; foe.y = me.y; foe.vx = foe.vy = 0;
      s.aim = {x:me.x + 1000, y:me.y};
      DUEL.frame(ts += 1000 / 60);
    }
    // Return ownership of the time origin to the normal animation loop.
    s.last = performance.now();
  });
}

(async () => {
  console.log('=== C03 mastery + input checks ===\n');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await boot(page);

  const pure = await page.evaluate(() => {
    const base = DuelProgress.blank();
    const loss = DuelProgress.update(base, { mission:0, won:false, seconds:9, shots:1, p:0.99 });
    const first = DuelProgress.update(loss.profile, { mission:0, won:true, seconds:20, shots:4, p:0.7 });
    const worse = DuelProgress.update(first.profile, { mission:0, won:true, seconds:30, shots:8, p:0.5 });
    const better = DuelProgress.update(worse.profile, { mission:0, won:true, seconds:15, shots:2, p:0.9 });
    const freeOpen = DuelProgress.update(better.profile, { mission:-1, won:true, matchFinished:false, matchWon:true });
    const freeWin = DuelProgress.update(freeOpen.profile, { mission:-1, won:true, matchFinished:true, matchWon:true });
    const freeLoss = DuelProgress.update(freeWin.profile, { mission:-1, won:false, matchFinished:true, matchWon:false });
    const invalid = DuelProgress.sanitize({
      missions:{ 0:{ bestTimeS:'fast', fewestShots:-2, bestMeasureP:4 }, 99:{ bestTimeS:1 } },
      free:{ wins:-1, losses:'many', streak:3, bestStreak:1 }, badges:['fake','bell-collapse','bell-collapse'],
    });
    const badgeNone = DuelProgress.earnedBadgeIds({ won:true, method:'measure', evidence:{} });
    const badgeLoss = DuelProgress.earnedBadgeIds({ won:false, method:'bell-measure',
      evidence:{ bellCollapse:true, tCampBroken:true, hotspotDefenseTime:1 } });
    const badges = DuelProgress.earnedBadgeIds({ won:true, method:'bell-measure',
      evidence:{ bellCollapse:true, tCampBroken:true, hotspotDefenseTime:0.5 } });
    return {
      lossMissions:Object.keys(loss.profile.missions),
      first:first.profile.missions[0], worse:worse.profile.missions[0], better:better.profile.missions[0],
      freeOpen:freeOpen.profile.free, freeWin:freeWin.profile.free, freeLoss:freeLoss.profile.free,
      invalid, badgeNone, badgeLoss, badges,
      next0:DuelProgress.nextBadge(base).id,
      nextAfterBell:DuelProgress.nextBadge({ ...base, badges:['bell-collapse'] }).id,
      dead:DuelInput.stick(0.1, -0.1), live:DuelInput.stick(0.8, 0),
    };
  });
  check('losses do not create mission records and worse wins cannot overwrite better ones',
    pure.lossMissions.length === 0 && pure.worse.bestTimeS === 20 && pure.worse.fewestShots === 4
      && pure.worse.bestMeasureP === 0.7 && pure.better.bestTimeS === 15
      && pure.better.fewestShots === 2 && pure.better.bestMeasureP === 0.9,
    JSON.stringify({ loss:pure.lossMissions, worse:pure.worse, better:pure.better }));
  check('free-duel W/L and streaks update only when a match finishes',
    pure.freeOpen.wins === 0 && pure.freeWin.wins === 1 && pure.freeWin.streak === 1
      && pure.freeLoss.losses === 1 && pure.freeLoss.streak === 0 && pure.freeLoss.bestStreak === 1,
    JSON.stringify({ open:pure.freeOpen, win:pure.freeWin, loss:pure.freeLoss }));
  check('invalid profile data is range-filtered and cannot leak missions or badges',
    Object.keys(pure.invalid.missions).length === 0 && pure.invalid.free.wins === 0
      && pure.invalid.free.losses === 0 && pure.invalid.free.streak === 3
      && pure.invalid.free.bestStreak === 3 && JSON.stringify(pure.invalid.badges) === '["bell-collapse"]',
    JSON.stringify(pure.invalid));
  check('mastery predicates require a real win and their named quantum evidence',
    pure.badgeNone.length === 0 && pure.badgeLoss.length === 0
      && JSON.stringify(pure.badges) === '["bell-collapse","phase-breaker","hotspot-guard"]'
      && pure.next0 === 'bell-collapse' && pure.nextAfterBell === 'phase-breaker',
    JSON.stringify({ none:pure.badgeNone, loss:pure.badgeLoss, pass:pure.badges,
      next0:pure.next0, nextAfterBell:pure.nextAfterBell }));
  check('controller dead zone suppresses drift while deliberate stick input survives',
    !pure.dead.active && pure.dead.x === 0 && pure.dead.y === 0
      && pure.live.active && pure.live.x > 0.7,
    JSON.stringify({ dead:pure.dead, live:pure.live }));

  const contract = await page.evaluate(() => {
    const text = document.querySelector('[data-controls-contract]').textContent.replace(/\s+/g, ' ').trim();
    openDuelMissions();
    return {
      text,
      mastery:[...document.querySelectorAll('[data-mastery]')].map(el => el.textContent.replace(/\s+/g, ' ').trim()),
      records:[...document.querySelectorAll('.mission-record')].map(el => el.textContent.trim()),
    };
  });
  check('the visible control contract and pre-play mastery cards match the production manifests',
    contract.text.includes('WASD') && contract.text.includes('ARROW KEYS')
      && contract.text.includes('RIGHT TRIGGER') && contract.text.includes('A / CROSS')
      && contract.mastery.length === 3 && contract.mastery.every(t => t.length > 35)
      && contract.records.length === 7,
    JSON.stringify(contract));

  // Keyboard-only: no mouse movement or click after startDuel.
  await page.evaluate(() => startDuel(0xC03));
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => DUEL.state.ships[0].ang < -1.2
    && DUEL.state.ships[0].ang > -1.95, null, { timeout:5000 });
  const keyboardAim = await page.evaluate(() => DUEL.state.ships[0].ang);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('d');
  await page.waitForTimeout(180);
  await page.keyboard.up('d');
  await page.keyboard.down('Shift');
  await page.waitForTimeout(180);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(550);
  await page.keyboard.down('f');
  await page.waitForTimeout(180);
  await page.keyboard.up('f');
  await page.keyboard.press('2');
  await page.keyboard.press('e');
  await page.keyboard.press('Space');
  const keyboard = await page.evaluate(() => ({
    angle:DUEL.state.ships[0].ang, vx:DUEL.state.ships[0].vx,
    shots:DUEL.state.shotCount, selfPulses:DUEL.state.selfPulses,
    beam:DUEL.state.beam, winding:DUEL.state.ships[0].winding,
    entangleShot:DUEL.state.proj.some(p => p.live && p.kind === 'entangle' && p.owner === 0),
    device:DUEL.state.inputDevice,
  }));
  await page.keyboard.press('Escape');
  const paused = await page.evaluate(() => DUEL.state.paused);
  await page.keyboard.press('Escape');
  const resumed = await page.evaluate(() => !DUEL.state.paused);
  check('keyboard-only bindings move, aim, attack, self-pulse, select, measure, entangle, and pause',
    keyboardAim < -1.2 && keyboardAim > -1.95 && keyboard.vx > 0
      && keyboard.shots >= 1 && keyboard.selfPulses >= 1 && keyboard.beam === 'Y'
      && keyboard.winding > 0 && keyboard.entangleShot && paused && resumed,
    JSON.stringify({ ...keyboard, keyboardAim, paused, resumed }));

  const holdLifecycle = await page.evaluate(() => {
    const evt = key => ({ key, preventDefault(){} });
    startDuel(0xC031);
    DUEL.onKey(evt('Shift'), true);
    const beforeBlur = DUEL.state.charging;
    window.dispatchEvent(new Event('blur'));
    const afterBlur = DUEL.state.charging;
    DUEL.onKey(evt('Shift'), false);
    DUEL.onKey(evt('Shift'), true);
    DUEL.onKey(evt('Escape'), true);
    const pause = { paused:DUEL.state.paused, charging:DUEL.state.charging };
    DUEL.onKey(evt('Escape'), false); DUEL.onKey(evt('Escape'), true); DUEL.onKey(evt('Escape'), false);
    DUEL.onKey(evt('Shift'), true);
    const beforeExit = DUEL.state.charging;
    exitDuel(false);
    return { beforeBlur, afterBlur, pause, beforeExit, afterExit:DUEL.state.charging, mode:MODE };
  });
  check('focus loss, pause, and mode exit cancel held charge without firing it',
    holdLifecycle.beforeBlur && !holdLifecycle.afterBlur && holdLifecycle.pause.paused
      && !holdLifecycle.pause.charging && holdLifecycle.beforeExit
      && !holdLifecycle.afterExit && holdLifecycle.mode === 'story',
    JSON.stringify(holdLifecycle));

  // Virtual standard controller: the browser API is a state snapshot, so the
  // harness swaps values exactly as hardware/Chrome would between frames.
  const pad = await page.evaluate(() => {
    startDuel(0xC04);
    window.__qbPad = {
      index:0, id:'Virtual Standard Pad', mapping:'standard', connected:true,
      axes:[0,0,0,0], buttons:Array.from({length:16}, () => ({value:0,pressed:false})),
    };
    window.__qbPads = [window.__qbPad];
    DUEL.setGamepadProvider(() => window.__qbPads);
    DUEL.pollGamepad(); // connection baseline: no held action may edge-fire
    window.__qbPad.axes = [0.8,0,0,-0.9];
    DUEL.pollGamepad();
    return { connected:DUEL.state.gamepad.index, move:DUEL.state.gamepad.move, aim:DUEL.state.gamepad.aim };
  });
  await page.waitForTimeout(160);
  const padActions = await page.evaluate(() => {
    const setButton = (i, value) => {
      window.__qbPad.buttons[i] = { value, pressed:value > 0.5 };
      DUEL.pollGamepad();
    };
    const B = DUEL_CONTROLS.gamepad.buttons;
    const xAfterMove = DUEL.state.ships[0].x;
    setButton(B.attack, 1);
    const charged = DUEL.state.charging && DUEL.state.chargeSource === 'gamepad-attack';
    DUEL.state.chargeT = 0.3;
    setButton(B.attack, 0);
    const fired = DUEL.state.shotCount > 0;
    DUEL.state.ships[0].beamCd = 0;
    setButton(B.selfPulse, 1);
    DUEL.state.chargeT = 0.3;
    setButton(B.selfPulse, 0);
    const selfPulsed = DUEL.state.selfPulses > 0;
    setButton(B.beamNext, 1); setButton(B.beamNext, 0);
    const beam = DUEL.state.beam;
    DUEL.state.ships[0].measCd = 0; DUEL.state.ships[0].winding = 0;
    setButton(B.measure, 1); setButton(B.measure, 0);
    const measured = DUEL.state.ships[0].winding > 0;
    DUEL.state.ships[0].entCd = 0; DUEL.state.bell = null;
    setButton(B.entangle, 1); setButton(B.entangle, 0);
    const entangled = DUEL.state.proj.some(p => p.live && p.kind === 'entangle' && p.owner === 0);
    setButton(B.pause, 1);
    const pausedNow = DUEL.state.paused;
    setButton(B.pause, 0); setButton(B.pause, 1);
    const resumedNow = !DUEL.state.paused;
    setButton(B.pause, 0);
    return { xAfterMove, charged, fired, selfPulsed, beam, measured, entangled, pausedNow, resumedNow,
      device:DUEL.state.inputDevice };
  });
  check('virtual standard gamepad moves, aims, attacks, self-pulses, selects, measures, entangles, and pauses',
    pad.connected === 0 && pad.move.active && pad.aim.active
      && padActions.xAfterMove > 281 && padActions.charged && padActions.fired
      && padActions.selfPulsed && padActions.beam === 'Y' && padActions.measured
      && padActions.entangled && padActions.pausedNow && padActions.resumedNow,
    JSON.stringify({ pad, actions:padActions }));

  const reconnect = await page.evaluate(() => {
    const B = DUEL_CONTROLS.gamepad.buttons;
    window.__qbPad.buttons[B.attack] = { value:1, pressed:true };
    DUEL.pollGamepad();
    const heldBeforeDisconnect = DUEL.state.charging;
    window.__qbPads = [];
    DUEL.pollGamepad();
    const afterDisconnect = { charging:DUEL.state.charging, index:DUEL.state.gamepad.index };
    window.__qbPads = [window.__qbPad]; // trigger is still physically held
    DUEL.pollGamepad();
    const afterReconnect = { charging:DUEL.state.charging, index:DUEL.state.gamepad.index };
    return { heldBeforeDisconnect, afterDisconnect, afterReconnect };
  });
  check('disconnect cancels held input and reconnect cannot replay a held trigger',
    reconnect.heldBeforeDisconnect && !reconnect.afterDisconnect.charging
      && reconnect.afterDisconnect.index === null && !reconnect.afterReconnect.charging
      && reconnect.afterReconnect.index === 0,
    JSON.stringify(reconnect));

  // Polling (above) would mask a dead listener, so fire only the browser event.
  const disconnectEvent = await page.evaluate(() => {
    const B = DUEL_CONTROLS.gamepad.buttons;
    window.__qbPad.buttons[B.attack] = { value:0, pressed:false };
    DUEL.pollGamepad();
    window.__qbPad.buttons[B.attack] = { value:1, pressed:true };
    DUEL.pollGamepad();
    const held = DUEL.state.charging;
    const ev = new Event('gamepaddisconnected');
    ev.gamepad = { index:0 };
    window.dispatchEvent(ev);
    return { held, charging:DUEL.state.charging, index:DUEL.state.gamepad.index };
  });
  check('the gamepaddisconnected event alone clears held input',
    disconnectEvent.held && !disconnectEvent.charging && disconnectEvent.index === null,
    JSON.stringify(disconnectEvent));

  // Earn every badge through the live shell: keyboard action → projectile →
  // collision/evidence → winning MEASURE → endRound → durable profile.
  await page.evaluate(() => {
    DUEL.setGamepadProvider(() => []);
    GAME.duelProfile = DuelProgress.blank();
    saveDuelProfile(GAME.duelProfile);
    GAME.difficulty = 0;
    startDuel(0xB311);
    // Keep the opponent on cooldown: this fixture tests earned player wins,
    // not whether the bot can win during a deliberately exposed setup.
    DUEL.state.ships[1].beamCd = DUEL.state.ships[1].measCd = 100;
    DUEL.state.ships[1].entCd = 100;
    const s = DUEL.state;
    s.rand = () => 0.1;
    s.ships[0].x = 300; s.ships[0].y = 400;
    s.ships[1].x = 370; s.ships[1].y = 400;
    s.aim = {x:1000,y:400};
  });
  await page.keyboard.press('e');
  await page.waitForTimeout(260);
  const linked = await page.evaluate(() => !!DUEL.state.bell && DUEL.state.ev.entangled);
  await page.keyboard.press('Space');
  await finishMeasureFixture(page);
  const bellBadge = await page.evaluate(() => ({
    over:DUEL.state.over, evidence:DUEL.state.ev.bellCollapse,
    earned:GAME.duelProfile.badges.includes('bell-collapse'), method:DUEL.state.round.method,
  }));

  await page.evaluate(() => {
    startDuel(0x7A5E, 4);
    // Keep the opponent on cooldown: this fixture tests earned player wins,
    // not whether the bot can win during a deliberately exposed setup.
    DUEL.state.ships[1].beamCd = DUEL.state.ships[1].measCd = 100;
    DUEL.state.ships[1].entCd = 100;
    const s = DUEL.state;
    s.rand = () => 0.1;
    s.ships[0].x = 300; s.ships[0].y = 400;
    s.ships[1].x = 370; s.ships[1].y = 400; // mission setup keeps its X eigenstate
    s.aim = {x:1000,y:400};
  });
  await page.keyboard.press('3');
  await page.keyboard.down('Shift');
  await page.waitForTimeout(80);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(260);
  const phaseEvidence = await page.evaluate(() => DUEL.state.ev.tCampBroken && DUEL.state.ev.usedT);
  await page.keyboard.press('Space');
  await finishMeasureFixture(page);
  const phaseBadge = await page.evaluate(() => ({
    evidence:DUEL.state.ev.tCampBroken, over:DUEL.state.over,
    earned:GAME.duelProfile.badges.includes('phase-breaker'),
    missionRecord:GAME.duelProfile.missions[4] || null,
  }));

  await page.evaluate(() => {
    startDuel(0x4075);
    // Keep the opponent on cooldown: this fixture tests earned player wins,
    // not whether the bot can win during a deliberately exposed setup.
    DUEL.state.ships[1].beamCd = DUEL.state.ships[1].measCd = 100;
    DUEL.state.ships[1].entCd = 100;
    const s = DUEL.state, zone = s.zones[0];
    s.rand = () => 0.1;
    s.ships[0].x = zone.x; s.ships[0].y = zone.y;
    s.ships[0].bloch = {x:0,y:0,z:-1}; // exposed at P(|1>)=1
  });
  await page.waitForTimeout(700);
  const hotspotEvidence = await page.evaluate(() => DUEL.state.ev.hotspotDefenseTime);
  await page.evaluate(() => {
    const s = DUEL.state, me = s.ships[0], foe = s.ships[1];
    foe.x = me.x + 70; foe.y = me.y; foe.vx = foe.vy = 0;
    foe.bloch = {x:0,y:0,z:-1}; s.aim = {x:me.x + 1000,y:me.y};
  });
  await page.keyboard.press('Space');
  await finishMeasureFixture(page);
  const hotspotBadge = await page.evaluate(() => ({
    evidence:DUEL.state.ev.hotspotDefenseTime, over:DUEL.state.over,
    earned:GAME.duelProfile.badges.includes('hotspot-guard'),
    all:GAME.duelProfile.badges.slice(), next:DuelProgress.nextBadge(GAME.duelProfile),
  }));
  check('all mastery badges require and survive their live quantum event + winning-MEASURE paths',
    linked && bellBadge.evidence && bellBadge.over && bellBadge.earned && bellBadge.method === 'bell-measure'
      && phaseEvidence && phaseBadge.evidence && phaseBadge.over && phaseBadge.earned && !!phaseBadge.missionRecord
      && hotspotEvidence >= 0.5 && hotspotBadge.evidence >= 0.5 && hotspotBadge.over
      && hotspotBadge.earned && hotspotBadge.all.length === 3 && hotspotBadge.next === null,
    JSON.stringify({ bell:bellBadge, phase:phaseBadge, hotspot:hotspotBadge, hotspotEvidence }));

  await page.reload({ waitUntil:'load' });
  const persisted = await page.evaluate(() => ({
    badges:GAME.duelProfile.badges.slice(), mission4:GAME.duelProfile.missions[4] || null,
  }));
  check('valid records and mastery survive a real reload',
    persisted.badges.length === 3 && !!persisted.mission4,
    JSON.stringify(persisted));

  // Invalid JSON must be survivable across a real reload, not only a pure call.
  await page.evaluate(() => localStorage.setItem(DUEL_PROFILE_KEY, '{broken'));
  await page.reload({ waitUntil:'load' });
  const reload = await page.evaluate(() => ({ profile:GAME.duelProfile, errors:window.__errors || [] }));
  check('malformed stored progress falls back safely during a real page load',
    Object.keys(reload.profile.missions).length === 0 && reload.profile.badges.length === 0
      && reload.profile.free.wins === 0,
    JSON.stringify(reload.profile));

  check('mastery/input flow produces no console errors', consoleErrors.length === 0,
    consoleErrors.join(' | ') || 'clean');
  await browser.close();

  const failed = results.filter(r => !r.pass);
  console.log(`\n${failed.length ? 'FAILED' : 'ALL CHECKS PASSED'} — ${results.length - failed.length}/${results.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
