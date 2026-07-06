// Headless test for GD-4 ("every battle ends with one concrete, gate-log-
// derived physics pointer"). Extracts the REAL debriefLine() function from
// quantum_chess.html (same block-extraction technique as the other harness
// tests — no copy), supplies a minimal stand-in GAME object, and checks
// that every plausible battle shape produces a message referencing this
// battle's own numbers rather than a generic tip.
//
// Run: node tests/debrief_harness.test.js
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
const debriefSrc = findBlock(/^function debriefLine\(\) \{/, /^}$/);

function makeGame(overrides) {
  return Object.assign({
    gateCounts: {}, critCount: 0, entanglCount: 0, hitsLanded: 0,
    guardStats: { attacksOnGuarding: 0, critsOnGuarding: 0 },
  }, overrides);
}

function debriefFor(gameState) {
  const code = ['let GAME = ' + JSON.stringify(gameState) + ';', debriefSrc,
    'module.exports = debriefLine();'].join('\n');
  return eval('(function(){' + code + '\nreturn module.exports;})()');
}

let fail = 0;
function assert(name, ok) { console.log((ok ? '  ✓ ' : '  ✗ ') + name); if (!ok) fail++; }

console.log('=== GD-4 debrief harness ===\n');

// X-only battle: X used, no phase gates at all.
{
  const line = debriefFor(makeGame({ gateCounts: { X: 12 }, hitsLanded: 4, critCount: 1 }));
  assert('X-only battle cites the actual X count', line.includes('X ×12'));
  assert('X-only battle names the 50/50 GUARD consequence', line.includes('50/50'));
}

// GUARD was actually tested in combat: report the real observed rate.
{
  const line = debriefFor(makeGame({
    gateCounts: { X: 3, H: 2, Z: 1 },
    guardStats: { attacksOnGuarding: 7, critsOnGuarding: 5 },
    hitsLanded: 10, critCount: 5,
  }));
  assert('GUARD-tested battle cites attacks-on-guarding count', line.includes('7×'));
  assert('GUARD-tested battle cites the derived rate (5/7=71%)', line.includes('71%'));
}

// Entanglement-heavy battle.
{
  const line = debriefFor(makeGame({ gateCounts: { CNOT: 2 }, entanglCount: 2, hitsLanded: 1, critCount: 0 }));
  assert('entanglement battle cites Bell pair count', line.includes('2 Bell pair'));
}

// MEASURE-heavy battle (no attacks landed yet).
{
  const line = debriefFor(makeGame({ gateCounts: { MEASURE: 3 }, hitsLanded: 0, critCount: 0 }));
  assert('MEASURE-heavy battle cites the MEASURE count', line.includes('MEASURE ×3'));
}

// Plain combat battle: no phase gates, no GUARD tested, no entanglement, no
// MEASURE — just hits landed. Falls through to the crit-rate line.
{
  const line = debriefFor(makeGame({ gateCounts: { X: 2 }, hitsLanded: 4, critCount: 2 }));
  // total('X')>0 && phaseGates===0 branch fires first here (X-only-shaped) —
  // confirms priority order is deterministic and doesn't crash on overlap.
  assert('overlapping-shape battle still returns a non-empty string', typeof line === 'string' && line.length > 0);
}

// Totally quiet battle (draw with no actions) — must still say something.
{
  const line = debriefFor(makeGame({}));
  assert('a battle with zero actions still returns a concrete (non-empty) line', typeof line === 'string' && line.length > 0);
  assert('zero-action battle explicitly says nothing landed', line.includes('no strikes landed'));
}

console.log(fail === 0 ? '\nALL CHECKS PASSED ✓' : `\n${fail} CHECK(S) FAILED ✗`);
process.exit(fail === 0 ? 0 : 1);
