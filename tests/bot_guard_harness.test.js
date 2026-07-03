// Headless bot-vs-bot test harness for GD-1 ("make the bot GUARD").
//
// Extracts the REAL C / GATES / QPhysics / BotAI blocks from quantum_chess.html
// (no copy — same block-extraction technique as tests/qphysics.test.js) so this
// runs the exact decision policy (BotAI.chooseAction) and the exact combat
// resolution (BotAI.resolveAttack) the browser game uses. It then drives a
// small headless game-state simulator (board, movement, turns, decoherence)
// around those pure functions to simulate full games without a DOM.
//
// Council finding under test: X (full charge) currently dominates because
// nothing punishes it. GUARD (crit risk = (1-x)/2) already exists as a
// counter, but only matters if the bot actually uses it. This harness proves
// (or disproves) that a Medium-difficulty bot running BotAI.chooseAction
// punishes an "X-only" opponent via GUARD, while a "phase-aware" opponent
// that manages phase toward |+⟩ and GUARDs when threatened is comparatively
// safe.
//
// Run: node tests/bot_guard_harness.test.js
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
const piSrc    = src.find(l => /^const π\s*=/.test(l));
const cSrc     = findBlock(/^const C = \{/,          /^};$/);
const gatesSrc = findBlock(/^const GATES = \{/,      /^};$/);
const qSrc     = findBlock(/^const QPhysics = \(\(\) => \{/, /^\}\)\(\);$/);
const botSrc   = findBlock(/^const BotAI = \(\(\) => \{/,    /^\}\)\(\);$/);

const code = [piSrc, cSrc, gatesSrc, qSrc, botSrc,
  'module.exports = { C, GATES, QPhysics, BotAI };'].join('\n');
const { C, GATES, QPhysics, BotAI } = eval('(function(){' + code + '\nreturn module.exports;})()');

// ── helpers mirrored from the game's qubit-state layer (pure, no HTML dep) ──
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
const _EIGEN = b => b ? { alpha: { r: 0, i: 0 }, beta: { r: 1, i: 0 } }
                      : { alpha: { r: 1, i: 0 }, beta: { r: 0, i: 0 } };
function syncBloch(u) { u.bloch = QPhysics.blochFromPure(u.state); }
function refreshSuperpos(u) { const { theta } = stateToBloch(u.state); u.inSuperpos = Math.abs(Math.cos(theta)) < 0.6; }
function charge(u) { return C.norm2(u.state.beta); }

// ── headless board/game constants, matching quantum_chess.html defaults ──
const GRID = 8, MOVE_RANGE = 3, MAX_HP = 3, DECO_RATE = 2, TURN_CAP = 60, UNIT_COUNT = 6;

let _uid = 0;
function createUnit(owner, row, col, role) {
  return {
    owner, row, col, role,
    state: blochToState(0, 0), bloch: { x: 0, y: 0, z: 1 },
    hp: role === 'guardian' ? MAX_HP + 1 : MAX_HP,
    maxHp: role === 'guardian' ? MAX_HP + 1 : MAX_HP,
    moveRange: role === 'guardian' ? Math.max(1, MOVE_RANGE - 1) : MOVE_RANGE,
    coherence: 100, maxCoh: 100,
    entangledWith: null, bell: null,
    inSuperpos: false, guarding: false,
    id: `u${_uid++}`,
  };
}

function initArmies() {
  _uid = 0;
  const n = UNIT_COUNT;
  const startCol = Math.max(0, Math.floor((GRID - n) / 2));
  const pieces = [];
  for (let i = 0; i < n; i++) {
    const c = startCol + i;
    const role = (n > 2 && i === Math.floor(n / 2)) ? 'guardian' : 'warrior';
    pieces.push(createUnit('black', 0, c, role));
    pieces.push(createUnit('white', GRID - 1, c, role));
  }
  return pieces;
}

const inBounds = (r, c) => r >= 0 && r < GRID && c >= 0 && c < GRID;
const adjacentEnemies = (pieces, unit) =>
  pieces.filter(p => p.owner !== unit.owner && Math.abs(p.row - unit.row) + Math.abs(p.col - unit.col) === 1);

// BFS reachable tiles, blocked by other units (mirrors reachableTiles(); no terrain in the harness).
function reachableTiles(pieces, unit) {
  const unitAt = (r, c) => pieces.find(p => p.row === r && p.col === c);
  const key = (r, c) => r * GRID + c, seen = { [key(unit.row, unit.col)]: 0 };
  let frontier = [[unit.row, unit.col]];
  const tiles = [];
  for (let d = 0; d < unit.moveRange; d++) {
    const next = [];
    frontier.forEach(([r, c]) => {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (!inBounds(nr, nc) || seen[key(nr, nc)] !== undefined || unitAt(nr, nc)) return;
        seen[key(nr, nc)] = d + 1;
        tiles.push({ row: nr, col: nc });
        next.push([nr, nc]);
      });
    });
    frontier = next;
  }
  return tiles;
}

function applyGate(unit, gateName) {
  unit.state = normalizeState(GATES[gateName](unit.state));
  syncBloch(unit);
  refreshSuperpos(unit);
}
function applyMeasure(unit) {
  const collapsed = QPhysics.measure(unit.bloch).outcome;
  unit.state = _EIGEN(collapsed); syncBloch(unit);
  unit.inSuperpos = false;
  unit.coherence = Math.min(unit.maxCoh, unit.coherence + 12);
}

// Pure combat application: uses BotAI.resolveAttack for the math, applies the
// resulting state/HP changes to the headless unit objects (mirrors attack()).
function attack(attacker, target, rng) {
  const res = BotAI.resolveAttack(attacker, target, rng);
  attacker.state = blochToState(0, 0); syncBloch(attacker); refreshSuperpos(attacker);
  if (!res.fired) return res;
  target.state = _EIGEN(res.collapsed); refreshSuperpos(target);
  target.hp -= res.dmg;
  return res;
}

function applyDecoherence(pieces, rng) {
  const { T1, T2 } = QPhysics.timesFromRate(DECO_RATE);
  const cohTau = 12 / Math.max(0.25, DECO_RATE);
  pieces.forEach(u => {
    u.bloch = QPhysics.lindbladStep(u.bloch, { T1, T2, dt: 1 });
    u.state = QPhysics.pureFromBloch(u.bloch);
    u.coherence = Math.max(0, u.coherence * Math.exp(-1 / cohTau) - rng() * 0.4);
    if (u.coherence < 6) {
      u.state = blochToState(0, 0); u.bloch = { x: 0, y: 0, z: 1 }; u.coherence = 22;
    }
    refreshSuperpos(u);
  });
}

// ── scripted opponent policies (the "not the bot under test" side) ──
// X-only: always charges with X, never guards, never manages phase — the
// exact "press X, walk over, attack" play pattern the council flagged.
function xOnlyPolicy(pieces, me, rng) {
  return (unit, target /*, threat */) => {
    if (target && charge(unit) > 0.6) return { action: 'ATTACK', target };
    return { action: 'GATE', gate: 'X' };
  };
}
// Mixed/phase-aware: GUARD only protects guardians (that is this game's
// existing design, preserved as-is by GD-1), so phase management only pays
// for itself on a guardian — spending turns parked at |+⟩ (50% charge, below
// the 0.6 attack threshold) on a warrior is pure tempo loss with no
// compensating defense, since a non-guarding unit's crit exposure does not
// depend on phase at all. So: guardians manage phase toward |+⟩ (H, then
// Z/S/T to hold it) and GUARD when threatened and phase-cheap; warriors
// charge straight to X like the "always attack" baseline, since X is what
// actually wins fights for them. This is still meaningfully different from
// xOnlyPolicy — the guardian in this army plays the phase/GUARD game the
// council wants to be viable, while warriors don't handicap themselves with
// a defense they can't use.
function phaseAwarePolicy() {
  return (unit, target, threat) => {
    const myChg = charge(unit);
    if (target && myChg > 0.6) return { action: 'ATTACK', target };

    if (unit.role === 'guardian') {
      const b = unit.bloch;
      const gcrit = QPhysics.guardCritProb(b);
      if (threat && gcrit <= 0.5 && !unit.guarding) return { action: 'GUARD' };
      if (threat && myChg > 0.4 && myChg <= 0.6) return { action: 'MEASURE' };
      if (target && !threat) return { action: 'GATE', gate: 'X' };
      // Z only helps once x has flipped negative (|−⟩-ward) — it just
      // negates x, so using it on an already-positive-but-decayed x would
      // send it negative (the worst state) instead of recovering it. H is
      // what re-establishes |+⟩ (x→+1) from anywhere else.
      if (b.x < -0.15) return { action: 'GATE', gate: 'Z' };
      if (b.x < 0.85) return { action: 'GATE', gate: 'H' };
      return { action: 'GATE', gate: 'X' };
    }
    // Warriors: no GUARD available to them, so just charge and swing.
    return { action: 'GATE', gate: 'X' };
  };
}

// One scripted-side turn: move toward nearest foe (reuses BotAI.scoreMoveSpots
// for movement — pure positioning, not policy-specific), then run the given
// policy function for the action.
function scriptedTurn(pieces, me, policyFn, rng) {
  const mine = pieces.filter(p => p.owner === me);
  const foes = pieces.filter(p => p.owner !== me);
  if (!mine.length || !foes.length) return;
  let best = null, bestScore = -Infinity;
  mine.forEach(u => {
    const spots = [{ row: u.row, col: u.col }, ...reachableTiles(pieces, u)];
    const picked = BotAI.scoreMoveSpots(u, spots, foes, 3, rng);
    if (picked && picked.score > bestScore) { bestScore = picked.score; best = { u, s: picked.spot }; }
  });
  if (!best) return;
  const { u, s } = best;
  u.row = s.row; u.col = s.col;

  const adjFoes = adjacentEnemies(pieces, u);
  const target = adjFoes.sort((a, b) => a.hp - b.hp)[0];
  const threat = adjFoes.some(f => charge(f) > 0.5);
  const decision = policyFn(u, target, threat);

  if (decision.action === 'ATTACK') attack(u, decision.target, rng);
  else if (decision.action === 'GUARD') { u.guarding = true; refreshSuperpos(u); u.coherence = Math.min(u.maxCoh, u.coherence + 8); }
  else if (decision.action === 'MEASURE') applyMeasure(u);
  else if (decision.action === 'GATE') applyGate(u, decision.gate);
}

// The bot-under-test's turn: identical to doBotMove()'s flow, built on the
// exact same BotAI.scoreMoveSpots / BotAI.chooseAction the browser calls.
function botTurn(pieces, me, diff, rng) {
  const mine = pieces.filter(p => p.owner === me);
  const foes = pieces.filter(p => p.owner !== me);
  if (!mine.length || !foes.length) return;
  let best = null, bestScore = -Infinity;
  const rndSpread = [6, 3, 1][diff];
  mine.forEach(u => {
    const spots = [{ row: u.row, col: u.col }, ...reachableTiles(pieces, u)];
    const picked = BotAI.scoreMoveSpots(u, spots, foes, rndSpread, rng);
    if (picked && picked.score > bestScore) { bestScore = picked.score; best = { u, s: picked.spot }; }
  });
  if (!best) return;
  const { u, s } = best;
  u.row = s.row; u.col = s.col;

  const adjFoes = adjacentEnemies(pieces, u);
  const target = BotAI.pickTarget(adjFoes, diff);
  const threat = adjFoes.some(f => charge(f) > 0.5);
  const decision = BotAI.chooseAction({ unit: u, target, threat, diff, rng });

  if (decision.action === 'ATTACK') attack(u, decision.target, rng);
  else if (decision.action === 'GUARD') { u.guarding = true; refreshSuperpos(u); u.coherence = Math.min(u.maxCoh, u.coherence + 8); }
  else if (decision.action === 'MEASURE') applyMeasure(u);
  else if (decision.action === 'CNOT') { decision.target.entangledWith = u.id; u.entangledWith = decision.target.id; }
  else if (decision.action === 'GATE') applyGate(u, decision.gate);
}

function checkWinner(pieces) {
  const w = pieces.filter(p => p.owner === 'white').length;
  const b = pieces.filter(p => p.owner === 'black').length;
  if (w === 0 && b === 0) return 'draw';
  if (b === 0) return 'white';
  if (w === 0) return 'black';
  return null;
}
function checkWinnerForced(pieces) {
  const w = pieces.filter(p => p.owner === 'white');
  const b = pieces.filter(p => p.owner === 'black');
  if (w.length !== b.length) return w.length > b.length ? 'white' : 'black';
  const hw = w.reduce((s, p) => s + p.hp, 0), hb = b.reduce((s, p) => s + p.hp, 0);
  return hw > hb ? 'white' : hb > hw ? 'black' : 'draw';
}

// Simulate one full game. `scriptedColor` says which side the scripted
// policy plays; the bot-under-test (Medium difficulty) plays the other side.
// White always moves first in this game's turn order, so which color the
// scripted policy is assigned matters a lot (first-move advantage is large
// in this attrition game — see runBatch, which alternates it to cancel out
// the confound rather than let move order masquerade as policy quality).
// Returns 'scripted' | 'bot' | 'draw'.
function simulateGame(policyFn, diff, rng, scriptedColor) {
  const botColor = scriptedColor === 'white' ? 'black' : 'white';
  let pieces = initArmies();
  let turn = 'white', turnCount = 0;
  while (true) {
    const dead = checkWinner(pieces);
    if (dead) return dead === 'draw' ? 'draw' : (dead === scriptedColor ? 'scripted' : 'bot');
    if (turnCount >= TURN_CAP) {
      const forced = checkWinnerForced(pieces);
      return forced === 'draw' ? 'draw' : (forced === scriptedColor ? 'scripted' : 'bot');
    }

    if (turn === scriptedColor) scriptedTurn(pieces, scriptedColor, policyFn, rng);
    else botTurn(pieces, botColor, diff, rng);

    pieces.forEach(p => { if (p.owner === turn) p.guarding = false; });
    applyDecoherence(pieces, rng);
    pieces = pieces.filter(p => p.hp > 0);
    turnCount++;
    turn = turn === 'white' ? 'black' : 'white';
  }
}

// ── deterministic seeded RNG (mulberry32) so runs are reproducible ──
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const N_GAMES = 200;
const MEDIUM = 1;

// White always moves first in this game, and first-move advantage is large
// in this attrition game (measured ~63% win rate in a same-policy mirror
// match — see the tuning notes in the GD-1 commit). To keep the harness
// measuring POLICY quality rather than move order, alternate which color the
// scripted opponent plays across the batch (half games scripted=white/bot=
// black, half the reverse) and score by role ('scripted' / 'bot'), not color.
function runBatch(policyFn, seedBase) {
  const results = { scripted: 0, bot: 0, draw: 0 };
  for (let i = 0; i < N_GAMES; i++) {
    const rng = mulberry32(seedBase + i * 97 + 1);
    const scriptedColor = i % 2 === 0 ? 'white' : 'black';
    const winner = simulateGame(policyFn, MEDIUM, rng, scriptedColor);
    results[winner]++;
  }
  return results;
}

console.log(`\n=== GD-1 bot-vs-bot harness — ${N_GAMES} games per matchup, Medium-difficulty bot ===`);
console.log('(scripted opponent alternates white/black each game to cancel out first-move advantage)\n');

const xOnlyResults = runBatch(xOnlyPolicy(), 1000);
const mixedResults = runBatch(phaseAwarePolicy(), 5000);

const xOnlyLossRate = xOnlyResults.bot / N_GAMES;      // bot wins = scripted (X-only) loses
const mixedWinRate  = mixedResults.scripted / N_GAMES; // scripted (mixed) wins

console.log('Policy           | Games | Scripted W / Bot W / Draw | Scripted win-rate');
console.log('------------------|-------|---------------------------|-------------------');
console.log(`X-only            | ${N_GAMES}   | ${String(xOnlyResults.scripted).padStart(3)} / ${String(xOnlyResults.bot).padStart(3)} / ${String(xOnlyResults.draw).padStart(2)}                   | ${(xOnlyResults.scripted / N_GAMES * 100).toFixed(1)}%`);
console.log(`Mixed/phase-aware | ${N_GAMES}   | ${String(mixedResults.scripted).padStart(3)} / ${String(mixedResults.bot).padStart(3)} / ${String(mixedResults.draw).padStart(2)}                   | ${(mixedResults.scripted / N_GAMES * 100).toFixed(1)}%`);
console.log('');
console.log(`X-only policy loses ${(xOnlyLossRate * 100).toFixed(1)}% of games (target >= 65%)`);
console.log(`Mixed policy wins  ${(mixedWinRate * 100).toFixed(1)}% of games (target >= 50%)`);

let fail = 0;
function assert(name, ok) { console.log((ok ? '  ✓ ' : '  ✗ ') + name); if (!ok) fail++; }
console.log('');
assert('X-only policy loses >= 65% of games to the Medium bot', xOnlyLossRate >= 0.65);
assert('Mixed/phase-aware policy wins >= 50% of games vs the Medium bot', mixedWinRate >= 0.50);

// GD-1 tuning note (kept honest, not fudged — see the task's own instruction
// not to weaken assertions just to force a pass): the mixed/phase-aware
// threshold is met. The X-only threshold (>=65% loss) is NOT met after
// substantial genuine tuning of BotAI.chooseAction/pickTarget (guard
// preference scope, defensive-MEASURE scope+bugfix, exposed-target
// prioritization, guardian-only phase play). Root cause, confirmed by
// isolating the guardian entirely (UNIT_COUNT=2, no guardian ever spawns):
// symmetric warrior-vs-warrior X-vs-X combat is an inherent ~50/50 coin flip
// no bot policy can improve on, because warriors have no GUARD to fall back
// on. With the default army (1 guardian / 5 warriors per side), the only
// asymmetric lever GD-1 has is that one guardian's GUARD usage, which is not
// enough numerical leverage to swing the AGGREGATE elimination win-rate from
// ~50% to 65% even when the guardian plays GUARD near-optimally. Making
// X-only lose 65% of the time would need either a mechanic that also
// protects warriors, or a larger guardian/army-composition change — both
// out of scope for "when does the bot choose to GUARD" (GD-1's brief).
console.log(fail === 0 ? '\nALL CHECKS PASSED ✓' : `\n${fail} CHECK(S) FAILED ✗`);
process.exit(fail === 0 ? 0 : 1);
