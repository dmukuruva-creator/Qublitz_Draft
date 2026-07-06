// Headless test for GD-3 ("missions structurally unwinnable without the
// target concept"). Extracts the REAL C / GATES / QPhysics / missionShieldBlocks
// blocks from quantum_chess.html (same block-extraction technique as
// tests/qphysics.test.js and tests/bot_guard_harness.test.js — no copy) so
// this exercises the exact shield logic the browser game runs.
//
// Each of Missions 4/5/6 gates ALL damage behind exactly one concept via a
// deterministic shield (missionShieldBlocks), not a probability tweak — so
// unlike GD-1/GD-2's bot-vs-bot win-rate harnesses, this proves the claim
// outright: an "X-only" attacker (only ever applies X, never touches
// H/Z/CNOT) can NEVER clear the shield, for any number of attempts, while
// the one correct gate always does.
//
// Run: node tests/mission_shield_harness.test.js
'use strict';
const fs = require('fs');
const path = require('path');
const htmlPath = process.argv[2] || path.join(__dirname, '..', 'quantum_chess.html');
const src = fs.readFileSync(htmlPath, 'utf8').split('\n');

function findBlock(startRe, closeRe) {
  const start = src.findIndex(l => startRe.test(l));
  if (start < 0) throw new Error('start not found: ' + startRe);
  for (let i = start; i < src.length; i++) {
    if (closeRe.test(src[i])) return src.slice(start, i + 1).join('\n');
  }
  throw new Error('close not found for: ' + startRe);
}
const piSrc      = src.find(l => /^const π\s*=/.test(l));
const cSrc       = findBlock(/^const C = \{/,          /^};$/);
const gatesSrc   = findBlock(/^const GATES = \{/,      /^};$/);
const qSrc       = findBlock(/^const QPhysics = \(\(\) => \{/, /^\}\)\(\);$/);
const shieldSrc  = findBlock(/^function missionShieldBlocks\(attacker, target\) \{/, /^}$/);

// missionShieldBlocks reads the module-level `GAME.campaignMission` — supply
// a minimal, mutable stand-in exactly like the browser's GAME object.
const code = [piSrc, cSrc, gatesSrc, qSrc,
  'let GAME = { campaignMission: null };',
  shieldSrc,
  'module.exports = { C, GATES, QPhysics, missionShieldBlocks, setMission: n => { GAME.campaignMission = n; } };',
].join('\n');
const { C, GATES, QPhysics, missionShieldBlocks, setMission } = eval('(function(){' + code + '\nreturn module.exports;})()');

function blochToState(theta, phi) {
  return { alpha: { r: Math.cos(theta / 2), i: 0 }, beta: C.fromPolar(Math.sin(theta / 2), phi) };
}
function stateToBloch(s) {
  const nA = C.norm(s.alpha);
  const theta = 2 * Math.acos(Math.min(1, nA));
  let phi = 0;
  if (C.norm(s.beta) > 1e-6) phi = Math.atan2(s.beta.i, s.beta.r) - Math.atan2(s.alpha.i, s.alpha.r);
  return { theta, phi };
}
function normalizeState(s) {
  const n = Math.sqrt(C.norm2(s.alpha) + C.norm2(s.beta));
  if (n < 1e-9) return { alpha: { r: 1, i: 0 }, beta: { r: 0, i: 0 } };
  return { alpha: C.scale(s.alpha, 1 / n), beta: C.scale(s.beta, 1 / n) };
}
function syncBloch(u) { u.bloch = QPhysics.blochFromPure(u.state); }
function refreshSuperpos(u) {
  const { theta } = stateToBloch(u.state);
  u.inSuperpos = Math.abs(Math.cos(theta)) < 0.6;
  if (u.inSuperpos) u.hasBeenSuperposed = true;   // mirrors the real refreshSuperpos (GD-3)
}
function applyGate(unit, gateName) {
  unit.state = normalizeState(GATES[gateName](unit.state));
  syncBloch(unit);
  refreshSuperpos(unit);
}
function makeUnit(state) {
  return { state, bloch: QPhysics.blochFromPure(state), hasBeenSuperposed: false, inSuperpos: false };
}

let fail = 0;
function assert(name, ok) { console.log((ok ? '  ✓ ' : '  ✗ ') + name); if (!ok) fail++; }

console.log('=== GD-3 mission-shield harness ===\n');

// ── Mission 4 (index 3) — SUPERPOSITION GAMBIT: needs hasBeenSuperposed ──
console.log('Mission 4 — Superposition Gambit:');
setMission(3);
{
  const target = { shieldNeedsSuperposedAttacker: true };
  const attacker = makeUnit(blochToState(0, 0));   // |0⟩, never gated
  assert('never-superposed attacker is blocked', missionShieldBlocks(attacker, target).blocked === true);

  // X-only: repeated X never induces superposition (it's a bit-flip between
  // eigenstates, never the equator) — the shield can NEVER open for it.
  for (let i = 0; i < 20; i++) applyGate(attacker, 'X');
  assert('X-only attacker (20 repeated X) is still blocked after 20 attempts', missionShieldBlocks(attacker, target).blocked === true);
  assert('X-only attacker never became superposed', attacker.hasBeenSuperposed === false);

  // Correct solution: H once, then the shield opens permanently (flag is sticky).
  const solved = makeUnit(blochToState(0, 0));
  applyGate(solved, 'H');
  assert('H once opens the shield', missionShieldBlocks(solved, target).blocked === false);
  applyGate(solved, 'X');   // even after subsequently charging up for the real hit
  assert('shield stays open after later gates (hasBeenSuperposed is sticky)', missionShieldBlocks(solved, target).blocked === false);
}

// ── Mission 5 (index 4) — PHASE GAMBIT: needs bloch.x > 0.5 (reach |+⟩) ──
console.log('\nMission 5 — Phase Gambit:');
setMission(4);
{
  const target = { shieldNeedsPlusPhaseAttacker: true };
  const attacker = makeUnit(blochToState(Math.PI / 2, Math.PI));   // |−⟩, x=-1
  assert('attacker starting in |−⟩ is blocked', missionShieldBlocks(attacker, target).blocked === true);
  assert('starting bloch.x is -1 (sanity)', Math.abs(attacker.bloch.x - (-1)) < 1e-9);

  // X-only: X on an equatorial state is invariant up to global phase — x
  // never moves off -1, so the shield can NEVER open for a pure X policy.
  for (let i = 0; i < 20; i++) applyGate(attacker, 'X');
  assert('X-only attacker (20 repeated X) is still blocked', missionShieldBlocks(attacker, target).blocked === true);
  assert('X-only attacker bloch.x never left the |−⟩ side', attacker.bloch.x <= 0.5);

  // Correct solution: Z flips |−⟩ → |+⟩ (x: -1 → +1), charge untouched.
  const solved = makeUnit(blochToState(Math.PI / 2, Math.PI));
  const chargeBefore = QPhysics.charge(solved.bloch);
  applyGate(solved, 'Z');
  assert('Z opens the shield (bloch.x > 0.5)', missionShieldBlocks(solved, target).blocked === false);
  assert('Z left charge unchanged (only a phase flip)', Math.abs(QPhysics.charge(solved.bloch) - chargeBefore) < 1e-9);
  // H does NOT solve it — H maps |−⟩ → |1⟩ (x back to 0), not |+⟩.
  const wrongGate = makeUnit(blochToState(Math.PI / 2, Math.PI));
  applyGate(wrongGate, 'H');
  assert('H alone does NOT open the shield (only Z does, from |−⟩)', missionShieldBlocks(wrongGate, target).blocked === true);
}

// ── Mission 6 (index 5) — ENTANGLEMENT SPLIT: never opens to a direct hit ──
console.log('\nMission 6 — Entanglement Split:');
setMission(5);
{
  const target = { shieldNeedsEntangledSplash: true };
  // No gate sequence whatsoever opens a direct hit on the shielded half —
  // by construction the ONLY documented way past it is the splash-damage
  // code path in attack() (a separate branch that never calls
  // missionShieldBlocks against the entangled partner), which this harness
  // doesn't need to re-simulate: the shield here is unconditional.
  ['H', 'X', 'Z', 'Y', 'S', 'T'].forEach(g => {
    const attacker = makeUnit(blochToState(0, 0));
    applyGate(attacker, g);
    assert(`direct hit after ${g} is still blocked (only splash bypasses this)`, missionShieldBlocks(attacker, target).blocked === true);
  });
}

// ── Shields are a no-op outside their own mission (and in free play) ──
console.log('\nShields do not leak outside their mission:');
{
  const s4 = { shieldNeedsSuperposedAttacker: true };
  const s5 = { shieldNeedsPlusPhaseAttacker: true };
  const s6 = { shieldNeedsEntangledSplash: true };
  const attacker = makeUnit(blochToState(0, 0));   // never gated, would trip every shield
  setMission(null);
  assert('Mission-4 shield inert in free play', missionShieldBlocks(attacker, s4).blocked === false);
  assert('Mission-5 shield inert in free play', missionShieldBlocks(attacker, s5).blocked === false);
  assert('Mission-6 shield inert in free play', missionShieldBlocks(attacker, s6).blocked === false);
  setMission(0);   // Mission 1 (Born Rule) running — Mission 4/5/6 shields must not fire
  assert('Mission-4 shield inert during Mission 1', missionShieldBlocks(attacker, s4).blocked === false);
}

console.log(fail === 0 ? '\nALL CHECKS PASSED ✓' : `\n${fail} CHECK(S) FAILED ✗`);
process.exit(fail === 0 ? 0 : 1);
