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
// GD-2 tuning note: a "guaranteed crit on a mid-pulse target" rule was tried
// here and measured (via a throwaway parameter sweep, not committed) to make
// X-only's win rate go UP against both Medium and Hard bots, not down — the
// bot's own warriors use X just as often as an X-only opponent does, so the
// rule punishes whichever side is slower to find an already-charged target,
// which is the bot, not the spammer. Reverted.
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
// Mixed/phase-aware: GD-1 follow-up made GUARD available to EVERY unit
// (was guardian-only) precisely because warrior-vs-warrior X-spam is a
// symmetric ~2.0-expected-damage swing (100% hit x 100% crit) no bot policy
// could out-tune while warriors had no defensive lever at all.
//
// Tuning note: an earlier version of this policy proactively primed phase
// toward |+⟩ (H, then Z/S/T) any time there was no immediate threat —
// modeled on the ORIGINAL guardian-only design, where only 1/6 units ever
// paid this cost. Applied army-wide it was measured to be a severe tempo
// loss: H leaves charge at ~50% (below the 0.6 attack threshold), so a
// unit spends its entire approach never reaching attack-ready charge,
// while X-only reaches 100% the instant it's adjacent. Direct matchup
// dropped to a 76%/21% X-only blowout. This version charges with X
// (matching X-only's own tempo) whenever there's no ACTIVE threat, and
// only reaches for GUARD/MEASURE reactively once one exists — GUARD still
// helps even from a plain eigenstate (x=0 → 50% crit exposure) vs. not
// guarding at all (100% exposure for an already-fully-charged target), so
// this is still a real, measured defensive edge over X-only, just without
// the proactive-priming tempo tax.
function phaseAwarePolicy() {
  return (unit, target, threat) => {
    const myChg = charge(unit);
    if (target && myChg > 0.6) return { action: 'ATTACK', target };

    const gcrit = QPhysics.guardCritProb(unit.bloch);
    if (threat && gcrit <= 0.5 && !unit.guarding) return { action: 'GUARD' };
    if (threat && myChg > 0.4 && myChg <= 0.6) return { action: 'MEASURE' };
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

    // GD-1 BUGFIX — mirrors quantum_chess.html's endTurn(): clear the NEW
    // side's stale guard (set 2 plies ago, already served its purpose of
    // protecting through the just-finished opponent turn), not the side
    // that just acted THIS ply (which would clear a guard before the
    // opponent ever got a turn against it — the bug this mirrors the fix
    // for). Flip BEFORE clearing.
    applyDecoherence(pieces, rng);
    pieces = pieces.filter(p => p.hp > 0);
    turnCount++;
    turn = turn === 'white' ? 'black' : 'white';
    pieces.forEach(p => { if (p.owner === turn) p.guarding = false; });
  }
}

// GD-2 — direct scripted-vs-scripted matchup: X-only vs Mixed/phase-aware,
// with NO Medium bot involved at all. This is the actual GD-2 bar ("no pure
// single-gate policy beats the mixed policy"), as opposed to GD-1's harness
// above which only measures each policy against the Medium bot separately.
// Returns 'a' | 'b' | 'draw'.
function simulateScriptedVsScripted(policyA, policyB, rng, aColor) {
  const bColor = aColor === 'white' ? 'black' : 'white';
  let pieces = initArmies();
  let turn = 'white', turnCount = 0;
  while (true) {
    const dead = checkWinner(pieces);
    if (dead) return dead === 'draw' ? 'draw' : (dead === aColor ? 'a' : 'b');
    if (turnCount >= TURN_CAP) {
      const forced = checkWinnerForced(pieces);
      return forced === 'draw' ? 'draw' : (forced === aColor ? 'a' : 'b');
    }
    if (turn === aColor) scriptedTurn(pieces, aColor, policyA, rng);
    else scriptedTurn(pieces, bColor, policyB, rng);

    // GD-1 BUGFIX — see the note in simulateGame() above; flip before clearing.
    applyDecoherence(pieces, rng);
    pieces = pieces.filter(p => p.hp > 0);
    turnCount++;
    turn = turn === 'white' ? 'black' : 'white';
    pieces.forEach(p => { if (p.owner === turn) p.guarding = false; });
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

// ═══════════════════════════════════════════════════════
// GD-2 — direct X-only vs Mixed/phase-aware matchup (no bot involved). This
// is GD-2's actual acceptance bar: "no pure single-gate policy beats the
// mixed policy." The GD-1 harness above only measures each policy against
// the Medium bot separately, which isn't the same claim.
// ═══════════════════════════════════════════════════════
function runDirectBatch(seedBase) {
  const results = { a: 0, b: 0, draw: 0 };
  for (let i = 0; i < N_GAMES; i++) {
    const rng = mulberry32(seedBase + i * 97 + 1);
    const aColor = i % 2 === 0 ? 'white' : 'black';
    // a = X-only, b = Mixed/phase-aware
    const winner = simulateScriptedVsScripted(xOnlyPolicy(), phaseAwarePolicy(), rng, aColor);
    results[winner]++;
  }
  return results;
}
const directResults  = runDirectBatch(9000);
const xOnlyDirectWinRate = directResults.a / N_GAMES;
const mixedDirectWinRate = directResults.b / N_GAMES;

console.log('\n=== GD-2 direct matchup — X-only vs Mixed/phase-aware, no bot ===\n');
console.log(`X-only(a) W / Mixed(b) W / Draw: ${directResults.a} / ${directResults.b} / ${directResults.draw}`);
console.log(`X-only win-rate: ${(xOnlyDirectWinRate * 100).toFixed(1)}%   Mixed win-rate: ${(mixedDirectWinRate * 100).toFixed(1)}%\n`);
assert('Mixed/phase-aware does not lose to pure X-only (GD-2 bar)', mixedDirectWinRate >= xOnlyDirectWinRate);

// GD-2 tuning note (kept honest, REWRITTEN after the cleanup pass found the
// truth): the previously shipped mechanic was a `lockedUntilTurn` field — X
// was meant to lock a unit out of its own next turn. It NEVER WORKED. The
// lock was set to turnCount+2, but the owner's next ply IS turnCount+2 and
// isLocked() tested with a strict `>` — an off-by-one that made the lock
// expire exactly one ply too early. Proven empirically: an instrumented
// sweep of all 600 games in this file counted 0 lock activations across
// 182,310 isLocked checks. Every balance number ever measured "with the
// lock" (including the earlier claim in this note that it flipped the GD-2
// assertion) was actually measured with the lock inert; the GD-2 pass came
// from the GD-1 GUARD fixes.
//
// Fixing the off-by-one (+3) was tried and BREAKS the game: with a real
// 1-own-turn lock plus per-turn Lindblad decay, "charge X then strike"
// collapses into re-charge loops for every policy — 171/200 draws vs the
// Medium bot (scripted never won a single game) and 200/200 draws in the
// direct matchup. This also reinterprets the old sweep note: its "2-turn
// lock deadlocks (0/0/300)" was actually a working 1-turn lock (same
// off-by-one), so the deadlock was this exact effect, not a mystery.
//
// Resolution (cleanup pass, 2026-07-05): the lock mechanic was REMOVED
// entirely — game and harness. Shipping a mechanic whose only observable
// effect was a misleading ⏳ badge during the opponent's ply is worse than
// shipping no mechanic. The X-cost design lever (HANDOFF GD-2: "X strong
// but committal") is future-cycle work and needs a shape that survives
// decay, e.g. X ends the unit's remaining turn rather than costing the
// next one. Other reverted experiments, still valid:
//   - Guaranteed-crit-on-a-mid-pulse-target: measurably made X-only's win
//     rate go UP against both bots (54.0%→56.0% Medium, 70.0%→72.3% Hard) —
//     the bot's own warriors use X just as often as an X-only opponent, so
//     the rule punishes whichever side is slower to find an already-charged
//     target, which is the bot. Do not reintroduce without re-measuring.
// Net: GD-2's own bar (mixed doesn't lose to X-only head-to-head) passes on
// the strength of the GD-1 GUARD fixes alone. GD-1's stricter bar (X-only
// losing >=65% to the Medium bot) remains unmet and documented.

// GD-1 tuning note — UPDATED after a real root-cause fix, not just more
// tuning. The previous version of this note (still worth recording) had
// concluded warrior-vs-warrior X-vs-X was an inherent, untunable ~50/50
// because "warriors have no GUARD to fall back on" — that diagnosis was
// itself wrong. The ACTUAL root cause, found by tracing an exact ply-by-ply
// sequence: quantum_chess.html's endTurn() cleared a side's OWN guard
// stances in the SAME ply they were set (before the opponent's very next
// turn ever happened), so GUARD had never once actually protected anyone,
// for any role, since the mechanic's original commit — the guardian's
// "defense" that GD-1 was tuning around was a no-op the entire time. Fixed
// by moving the clear to run for the new (about-to-act) side right after
// the turn flips, so a guard set on ply N now correctly survives the
// opponent's ply N+1 and only expires when the guarding side is about to
// act again on ply N+2 (mirrored here in simulateGame/simulateScriptedVsScripted).
// Once GUARD actually worked, it was extended to every role (not just
// guardians — see quantum_chess.html's BotAI.chooseAction comments), which
// immediately exposed a SECOND real bug: the guard-preference branches
// triggered on ANY adjacent enemy (`nearFoe`), not one that was actually
// charged/dangerous (`threat`) — army-wide, this made every unit brace
// defensively near any foe and never build enough charge to attack at all
// (traced: a bot that never once chose ATTACK in 30 plies, losing 0/200
// games). Narrowing the guard triggers to `threat` only fixed that.
// Current state, honestly: GD-2's own bar (mixed doesn't lose to X-only
// head-to-head) now passes clearly (~59-65% mixed win-rate, was ~48%).
// GD-1's specific, stricter bar (X-only loses >=65% to the Medium bot) is
// SUBSTANTIALLY improved (was 38.5% loss / 61.5% X-only win at session
// start, now ~26-30% loss / ~70-74% X-only win against the tuned bot specifically)
// but still not met. This is now a genuine, live balance question rather
// than a broken mechanic: the bot's reactive-only GUARD (no proactive H
// phase-priming, since priming was measured to cost more tempo than it's
// worth — see phaseAwarePolicy's own tuning note above) caps crit
// mitigation at 50% (an eigenstate's gcrit), while X-only's uninterrupted
// charge→attack cycle is faster than the bot's charge→(sometimes guard)→
// attack cycle. Closing the remaining gap needs either a smarter turn-economy
// model (when IS it worth trading an attack for a defend?) or army/mechanic
// changes — flagged for whoever picks this back up, rather than further
// tuning against diminishing returns (see GD-2's own tuning note above for
// why that path was deliberately not pushed further this pass: two
// additional bot-logic tweaks were tried live, one made things worse and
// was reverted, consistent with "measure, don't guess" throughout this file).
console.log(fail === 0 ? '\nALL CHECKS PASSED ✓' : `\n${fail} CHECK(S) FAILED ✗`);
process.exit(fail === 0 ? 0 : 1);
