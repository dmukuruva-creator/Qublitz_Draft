// PD-12 — Photon Duel rules harness (design doc §9), same shape as
// mission_shield_harness.test.js: regex-extract the REAL source blocks out of
// quantum_chess.html and eval them in Node, so this can never drift from what
// the browser runs.
//
// D0 scope is §9 cases 1, 3, 7, 8 plus 1b (see below). Cases 2/4/5/6 arrive
// with the mechanics they test (eigenstate shield boundary and bot liveness in
// D1, biomes in D2) — they are listed as PENDING at the end of the run rather
// than silently omitted, so the gap is visible in the output.
//
// Case 1b is not in §9 and is the most important test here. DuelCore.rotateBloch
// is the one piece of duel physics that is not a direct QPhysics call (QPhysics
// rotates pure spinors; a decohering duel qubit is a mixed state with |r|<1
// that no spinor can express). 1b asserts rotateBloch agrees with
// QPhysics.rabiRotateState to machine precision on pure states — i.e. that it
// is the engine's own rotation generalized, not a second physics. If that ever
// fails, the duel has silently forked from the campaign's engine.
//
// Run: node tests/duel_harness.test.js [path-to-alternate-html]
'use strict';
const fs = require('fs');
const path = require('path');

const HTML = process.argv[2] || path.join(__dirname, '..', 'quantum_chess.html');
const lines = fs.readFileSync(HTML, 'utf8').split('\n');

function findBlock(startRe, endRe) {
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (start === -1 && startRe.test(lines[i])) { start = i; continue; }
    if (start !== -1 && endRe.test(lines[i])) return lines.slice(start, i + 1).join('\n');
  }
  throw new Error(`block not found: ${startRe}`);
}

const piSrc    = lines.find(l => /^const π\s+=/.test(l));
const cSrc     = findBlock(/^const C = \{/,                    /^};$/);
const gatesSrc = findBlock(/^const GATES = \{/,                /^};$/);
const qSrc     = findBlock(/^const QPhysics = \(\(\) => \{/,   /^\}\)\(\);$/);
const duelSrc  = findBlock(/^const DuelCore = \(\(\) => \{/,   /^\}\)\(\);$/);

const code = [piSrc, cSrc, gatesSrc, qSrc, duelSrc,
  'module.exports = { C, GATES, QPhysics, DuelCore };'].join('\n');
const { GATES, QPhysics, DuelCore } = eval('(function(){' + code + '\nreturn module.exports;})()');

const K = DuelCore.K;
const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });
const approx = (a, b, eps) => Math.abs(a - b) <= eps;

const KET0 = { x: 0, y: 0, z: 1 };
const KET1 = { x: 0, y: 0, z: -1 };
const PLUS = { x: 1, y: 0, z: 0 };
const MINUS = { x: -1, y: 0, z: 0 };

// ── Case 1 — charge-to-θ mapping (§3.2: θ = π·min(t/1.2, 1)) ──────────
{
  const want = [[0.15, Math.PI / 8], [0.6, Math.PI / 2], [1.2, Math.PI], [2.0, Math.PI]];
  const got = want.map(([t]) => DuelCore.chargeToTheta(t));
  const ok = want.every(([, exp], i) => approx(got[i], exp, 1e-12));
  check('1. hold {0.15,0.6,1.2,2.0}s → θ {π/8,π/2,π,π}', ok,
    got.map(v => (v / Math.PI).toFixed(4) + 'π').join(', '));

  // A full-hold X-beam on |0⟩ must reach exactly 100% charge — the π-pulse
  // is the whole reason the bar is labelled in π-fractions.
  const hit = DuelCore.applyBeamHit(KET0, 'X', DuelCore.chargeToTheta(1.2));
  check('1a. full-hold X-beam on |0⟩ → charge 1.000 (π-pulse)',
    approx(DuelCore.odds(hit.bloch), 1, 1e-12),
    `charge=${DuelCore.odds(hit.bloch).toFixed(12)}`);
}

// ── Case 1b — rotateBloch IS QPhysics' rotation (see header) ──────────
{
  const ket0 = { alpha: { r: 1, i: 0 }, beta: { r: 0, i: 0 } };
  const states = [ket0,
    { alpha: { r: 0.6, i: 0 }, beta: { r: 0.8, i: 0 } },
    GATES.H(ket0), GATES.T(GATES.H(ket0)), GATES.Y(GATES.H(ket0))];
  const thetas = [0.1, Math.PI / 4, Math.PI / 2, Math.PI, 1.9 * Math.PI, 2 * Math.PI];
  let worst = 0;
  for (const th of thetas) for (const st of states) {
    const viaEngine = QPhysics.blochFromPure(QPhysics.rabiRotateState(st, th));
    const viaDuel = DuelCore.rotateBloch(QPhysics.blochFromPure(st), DuelCore.AXES.X, th);
    worst = Math.max(worst, Math.abs(viaEngine.x - viaDuel.x),
      Math.abs(viaEngine.y - viaDuel.y), Math.abs(viaEngine.z - viaDuel.z));
  }
  check('1b. rotateBloch ≡ QPhysics.rabiRotateState on pure states (30 cases)',
    worst < 1e-12, `max deviation ${worst.toExponential(2)}`);

  // Unitary: a rotation must never change |r| (that is decoherence's job).
  const mixed = { x: 0.3, y: -0.2, z: 0.5 };
  const before = Math.hypot(mixed.x, mixed.y, mixed.z);
  const after = DuelCore.rotateBloch(mixed, DuelCore.AXES.Y, 1.234);
  check('1c. rotation preserves |r| on a MIXED state (no purity leak)',
    approx(Math.hypot(after.x, after.y, after.z), before, 1e-12),
    `|r| ${before.toFixed(12)} → ${Math.hypot(after.x, after.y, after.z).toFixed(12)}`);
}

// ── Case 3 — Born rule: 10k seeded MEASUREs at P=0.7 → 0.7 ± 0.02 ─────
{
  // Build the exact state whose P(|1⟩)=0.7 by construction: z = 1-2p.
  const target = { x: 0, y: 0, z: 1 - 2 * 0.7 };
  const p = DuelCore.odds(target);
  const rand = DuelCore.mulberry32(0xC0FFEE);
  let wins = 0;
  const N = 10000;
  for (let i = 0; i < N; i++) if (DuelCore.measureRoll(target, rand).outcome === 1) wins++;
  const rate = wins / N;
  check('3. 10,000 seeded MEASUREs at P=0.7 → win-rate 0.7 ± 0.02',
    approx(p, 0.7, 1e-12) && approx(rate, 0.7, 0.02),
    `stated P=${p.toFixed(4)}, observed ${rate.toFixed(4)} (${wins}/${N})`);
}

// ── Case 7 — dud MEASURE resets the target to |0⟩ ─────────────────────
{
  const rand0 = () => 0.999999;   // forces outcome 0 against any p<1
  const rand1 = () => 0;          // forces outcome 1 against any p>0
  const charged = { x: 0, y: 0, z: 1 - 2 * 0.9 };

  const dud = DuelCore.measureRoll(charged, rand0);
  const okDud = dud.outcome === 0
    && approx(dud.bloch.z, 1, 1e-12)
    && approx(DuelCore.odds(dud.bloch), 0, 1e-12);
  check('7. dud MEASURE (outcome 0) resets target to |0⟩, charge 0', okDud,
    `outcome=${dud.outcome} z=${dud.bloch.z} charge=${DuelCore.odds(dud.bloch).toFixed(6)}`);

  const win = DuelCore.measureRoll(charged, rand1);
  check('7a. winning MEASURE (outcome 1) collapses to |1⟩', win.outcome === 1
    && approx(win.bloch.z, -1, 1e-12), `outcome=${win.outcome} z=${win.bloch.z}`);

  // After a dud the target is at an X-beam's disposal again from scratch:
  // one full π-pulse must take it back to 100%, or the "re-rotate from
  // scratch" cost isn't real.
  const back = DuelCore.applyBeamHit(dud.bloch, 'X', DuelCore.chargeToTheta(1.2));
  check('7b. post-dud |0⟩ is re-chargeable to 1.0 by one π-pulse',
    approx(DuelCore.odds(back.bloch), 1, 1e-12),
    `charge=${DuelCore.odds(back.bloch).toFixed(12)}`);
}

// ── Eigenstate no-op (D1's case 2 boundary is not asserted yet, but the
//    core invariant — parking at ±axis makes that axis inert — is live in
//    D0 because applyBeamHit already implements it) ─────────────────────
{
  const shielded = DuelCore.applyBeamHit(PLUS, 'X', Math.PI);
  const hit = DuelCore.applyBeamHit(KET0, 'X', Math.PI);
  check('e1. |+⟩ is inert to an X-beam (shielded, state unchanged)',
    shielded.shielded === true && approx(shielded.bloch.x, 1, 1e-12),
    `shielded=${shielded.shielded}`);
  check('e2. |0⟩ is NOT shielded from an X-beam', hit.shielded === false,
    `shielded=${hit.shielded}`);
  check('e3. |−⟩ also inert to X (either pole of the axis)',
    DuelCore.isEigenstate(MINUS, 'X') === true,
    `angle=${DuelCore.eigenstateAngleDeg(MINUS, 'X').toFixed(2)}°`);
}

// ── Decoherence routes through the campaign's own Lindblad step ───────
{
  const ref = QPhysics.lindbladStep(PLUS, { T1: K.T1_S, T2: K.T2_S, dt: 5 });
  const via = DuelCore.decayStep(PLUS, 5);
  check('d1. decayStep is exactly QPhysics.lindbladStep (T1=90s,T2=30s)',
    approx(ref.x, via.x, 1e-15) && approx(ref.z, via.z, 1e-15),
    `x ${via.x.toFixed(9)} vs ${ref.x.toFixed(9)}`);

  // Idling must actually cost you: a charged, coherent state loses odds.
  const start = DuelCore.applyBeamHit(KET0, 'X', Math.PI / 2).bloch;
  const idled = DuelCore.decayStep(start, 10);
  check('d2. idling 10s strictly reduces MEASURE odds (T1 relaxation)',
    DuelCore.odds(idled) < DuelCore.odds(start),
    `${DuelCore.odds(start).toFixed(4)} → ${DuelCore.odds(idled).toFixed(4)}`);

  // …and it shrinks the vector, which is what the HUD sphere shows.
  const rBefore = Math.hypot(start.x, start.y, start.z);
  const rAfter = Math.hypot(idled.x, idled.y, idled.z);
  check('d3. idling shrinks |r| (visible decoherence, not just relaxation)',
    rAfter < rBefore, `|r| ${rBefore.toFixed(4)} → ${rAfter.toFixed(4)}`);
}

// ── Case 8 — the campaign engine is untouched ─────────────────────────
{
  const st = QPhysics.selfTest();
  check('8. QPhysics.selfTest() still green (engine unchanged by the duel)',
    st.pass === true, `${st.tests.filter(t => t[1]).length}/${st.tests.length} engine tests`);
}

// ── Report ───────────────────────────────────────────────────────────
console.log('=== PD-12 Photon Duel harness (D0 scope) ===\n');
let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`  ${r.pass ? '✓' : '✗'} ${r.name}`);
  if (r.detail) console.log(`      ${r.detail}`);
}
console.log('\n  PENDING (arrive with the mechanics they test):');
console.log('    · §9.2 eigenstate boundary at ±9°/11° — D1 (shield tuning)');
console.log('    · §9.4 nebula T2 ratio · §9.5 phase-rift composite — D2 (biomes)');
console.log('    · §9.6 bot liveness / no-NaN over a 60s sim — D1 (DuelBot)');
console.log(failed ? `\n${failed} CHECK(S) FAILED ✗` : '\nALL CHECKS PASSED ✓');
process.exit(failed ? 1 : 0);
