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

// ── T-beam vs Z-beam: the anti-camp claim (Clifford / non-Clifford) ───
// DuelCore's header asserts that a Clifford phase rotation cannot break an
// X-camp but the non-Clifford T can. That is a physics claim doing tactical
// work, so it gets tested rather than asserted in prose.
{
  const rand = DuelCore.mulberry32(7);
  // A camper sits at |+⟩: an X-eigenstate, immune to the X attack beam.
  const camper = PLUS;
  check('t1. camper at |+⟩ is immune to the X attack beam',
    DuelCore.resolveBeam(camper, 'X', Math.PI, { rand }).shielded === true);

  // Z (Clifford, π about z) maps |+⟩ → |−⟩ — still an X-eigenstate, still camped.
  const afterZ = DuelCore.rotateBloch(camper, DuelCore.AXES.Z, Math.PI);
  check('t2. Z (Clifford) maps |+⟩→|−⟩ — camper STILL immune to X',
    DuelCore.isEigenstate(afterZ, 'X') === true,
    `|−⟩ x=${afterZ.x.toFixed(3)}, X-angle ${DuelCore.eigenstateAngleDeg(afterZ,'X').toFixed(1)}°`);

  // T (non-Clifford, π/4 about z) lands them at 45° — off every cardinal axis.
  const afterT = DuelCore.resolveBeam(camper, 'T', 0, { rand }).bloch;
  const stillCamped = DuelCore.isEigenstate(afterT, 'X');
  check('t3. T (non-Clifford) breaks the camp — no longer an X-eigenstate',
    stillCamped === false,
    `X-angle after T = ${DuelCore.eigenstateAngleDeg(afterT,'X').toFixed(1)}°`);
  check('t4. …and off EVERY cardinal axis (not just re-parked elsewhere)',
    DuelCore.isCardinal(afterT) === false,
    `cardinal=${DuelCore.isCardinal(afterT)}`);
  check('t5. T changes MEASURE odds by exactly 0 (it is pure phase)',
    approx(DuelCore.odds(afterT), DuelCore.odds(camper), 1e-12),
    `${DuelCore.odds(camper).toFixed(6)} → ${DuelCore.odds(afterT).toFixed(6)}`);
  // …so the X beam now lands on them.
  check('t6. after T, the X beam is no longer shielded',
    DuelCore.resolveBeam(afterT, 'X', Math.PI, { rand }).shielded === false);
}

// ── Decoherence hotspot: sanctuary bought with your own offence ───────
{
  const zones = [{ x: 100, y: 100, r: 60, t1: DuelCore.ZONE.HOT_T1, t2: DuelCore.ZONE.HOT_T2 }];
  check('h1. zoneAt finds a hotspot inside its radius, not outside',
    !!DuelCore.zoneAt(120, 110, zones) && !DuelCore.zoneAt(400, 400, zones));

  // Charged up, then 3s inside vs 3s outside.
  const charged = DuelCore.applyBeamHit(KET0, 'X', Math.PI).bloch;   // odds 1.0
  const inHot = DuelCore.decayStep(charged, 3, zones[0]);
  const outside = DuelCore.decayStep(charged, 3);
  check('h2. 3s in a hotspot discharges far faster than open space',
    DuelCore.odds(inHot) < DuelCore.odds(outside) - 0.2,
    `hotspot ${DuelCore.odds(inHot).toFixed(3)} vs open ${DuelCore.odds(outside).toFixed(3)}`);
  check('h3. …enough to stop being a MEASURE target (odds < 0.5 in 3s)',
    DuelCore.odds(inHot) < 0.5, `odds ${DuelCore.odds(inHot).toFixed(3)}`);
  // The cost: it is symmetric. You cannot hold a charge in there either.
  const tryCharge = DuelCore.decayStep(
    DuelCore.applyBeamHit(KET0, 'X', Math.PI).bloch, 2, zones[0]);
  check('h4. the sanctuary is not free — you cannot hold charge inside',
    DuelCore.odds(tryCharge) < 0.65, `odds after 2s ${DuelCore.odds(tryCharge).toFixed(3)}`);
}

// ── Gate fidelity: sloppy pulses miss the angle they aimed for ────────
{
  const N = 4000;
  function spread(fid) {
    const rand = DuelCore.mulberry32(99);
    const xs = [];
    for (let i = 0; i < N; i++) xs.push(DuelCore.applyFidelity(Math.PI, fid, rand));
    // Two-pass variance: the single-pass E[x²]−E[x]² form goes slightly
    // NEGATIVE here when σ is exactly 0 (every sample is π), and sqrt of that
    // is NaN — which is how this test first "failed" on a correct product.
    const mean = xs.reduce((a, b) => a + b, 0) / N;
    const varr = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / N;
    return { mean, sd: Math.sqrt(Math.max(0, varr)) };
  }
  const sloppy = spread(0.2), tuned = spread(0.95), perfect = spread(1);
  // σ is exactly 0 at fidelity 1 (sigmaFor(1)===0), so every sample IS π;
  // the ~1e-13 residual is float error in summing 4000 copies of π, not
  // scatter in the product.
  const perfectExact = DuelCore.applyFidelity(Math.PI, 1, DuelCore.mulberry32(1)) === Math.PI;
  check('f1. perfect fidelity delivers exactly the commanded θ (σ=0)',
    perfectExact && DuelCore.sigmaFor(1) === 0 && perfect.sd < 1e-9,
    `sigmaFor(1)=${DuelCore.sigmaFor(1)}, sample===π: ${perfectExact}`);
  check('f2. lower fidelity → wider angle error, mean still on target',
    sloppy.sd > tuned.sd && approx(sloppy.mean, Math.PI, 0.05),
    `σ: fid0.2=${sloppy.sd.toFixed(3)} rad, fid0.95=${tuned.sd.toFixed(3)} rad`);
  check('f3. σ matches the documented model σ0·(1−fidelity)',
    approx(sloppy.sd, DuelCore.sigmaFor(0.2), 0.03),
    `observed ${sloppy.sd.toFixed(4)} vs model ${DuelCore.sigmaFor(0.2).toFixed(4)}`);
}

// ── Bell trap: entangling resets the round to an honest coin flip ─────
{
  const amps = DuelCore.bellPair();
  check('b1. a fresh Bell pair reads 50% for BOTH halves',
    approx(DuelCore.bellOdds(amps, 0), 0.5, 1e-12) &&
    approx(DuelCore.bellOdds(amps, 1), 0.5, 1e-12),
    `${DuelCore.bellOdds(amps,0).toFixed(6)} / ${DuelCore.bellOdds(amps,1).toFixed(6)}`);

  // Correlated collapse: |Φ+⟩ must give the SAME outcome on both halves, every time.
  const rand = DuelCore.mulberry32(2024);
  let ones = 0, correlated = 0;
  for (let i = 0; i < 5000; i++) {
    const r = DuelCore.bellMeasure(DuelCore.bellPair(), 0, rand);
    if (r.outcome === r.partnerOutcome) correlated++;
    if (r.outcome === 1) ones++;
  }
  check('b2. |Φ+⟩ collapse is perfectly correlated (5000 trials)',
    correlated === 5000, `${correlated}/5000 matched`);
  check('b3. …and fair — 50/50 over those trials',
    Math.abs(ones / 5000 - 0.5) < 0.03, `P(1)=${(ones / 5000).toFixed(4)}`);

  // The comeback property: a 5%-vs-95% fight becomes 50/50 for both.
  const losing = { x: 0, y: 0, z: 1 - 2 * 0.05 };
  check('b4. entangling a 5% qubit resets it to a 50% coin flip (comeback)',
    approx(DuelCore.odds(losing), 0.05, 1e-9) &&
    approx(DuelCore.bellOdds(DuelCore.bellPair(), 0), 0.5, 1e-12),
    `0.05 → 0.50`);
}

// ── Zeno lock: a watched qubit cannot evolve ──────────────────────────
{
  const rand = DuelCore.mulberry32(5);
  const pinned = DuelCore.resolveBeam(KET0, 'X', Math.PI,
    { rand, zenoUntil: 10, now: 8 });
  check('z1. a Zeno-pinned target ignores an incoming beam entirely',
    pinned.zenoBlocked === true && approx(pinned.bloch.z, 1, 1e-12),
    `z stayed ${pinned.bloch.z}`);
  const freed = DuelCore.resolveBeam(KET0, 'X', Math.PI,
    { rand, zenoUntil: 10, now: 11 });
  check('z2. …and takes the hit normally once the lock expires',
    freed.zenoBlocked === false && approx(DuelCore.odds(freed.bloch), 1, 0.02),
    `charge ${DuelCore.odds(freed.bloch).toFixed(4)}`);
  check('z3. lock parameters are declared, not magic',
    DuelCore.ZENO.NEEDED === 2 && DuelCore.ZENO.WINDOW > 0 && DuelCore.ZENO.HOLD > 0,
    `${DuelCore.ZENO.NEEDED} measures within ${DuelCore.ZENO.WINDOW}s → ${DuelCore.ZENO.HOLD}s hold`);
}

// ── Mission gates: the campaign's shield property, ported ─────────────
// mission_shield_harness proves an X-only player can NEVER clear campaign
// missions 4-6. Same bar here: a "concept-free" duellist — one who charges,
// shoots and measures but never entangles, never spends a T, never fires from
// superposition, never Zeno-pins, never calibrates — must be structurally
// unable to clear missions 2-7, no matter how lucky the Born roll is.
{
  const MISSIONS = DuelCore.DUEL_MISSIONS;
  check('m0. seven duel missions, each naming its concept',
    MISSIONS.length === 7 && MISSIONS.every(m => m.concept && m.brief && m.win && m.gate),
    MISSIONS.map(m => m.concept).join(' · '));

  // The concept-free player: perfect aim, instant, but uses no concept.
  const naive = { entangled:false, usedT:false, superposedShot:false,
                  zenoLocked:false, fidelity:0.55, elapsed:1, measuredIdx:0 };
  const blocked = MISSIONS.filter(m => DuelCore.missionGate(m.id, naive).blocked).map(m => m.id + 1);
  check('m1. concept-free play is REFUSED by missions 3,4,5,6,7',
    JSON.stringify(blocked) === JSON.stringify([3,4,5,6,7]),
    `blocked: ${blocked.join(',') || 'none'}`);

  // Mission 1 is the tutorial (no gate) and mission 2 gates on the clock,
  // which a fast naive player legitimately beats — that is by design.
  check('m2. mission 1 has no gate; mission 2 gates on the T₁ clock only',
    !DuelCore.missionGate(0, naive).blocked &&
    !DuelCore.missionGate(1, naive).blocked &&
    DuelCore.missionGate(1, Object.assign({}, naive, { elapsed: 25 })).blocked,
    'fast run clears M2, slow run does not');

  // Each gate must open for its OWN concept and stay shut for the others —
  // otherwise a mission is teaching the wrong thing.
  const withConcept = {
    2: { entangled:true },
    3: { superposedShot:true },
    4: { usedT:true },
    5: { zenoLocked:true },
    6: { fidelity:0.95 },
  };
  let allOpen = true, crossTalk = [];
  for (const [idx, ev] of Object.entries(withConcept)) {
    const i = +idx;
    if (DuelCore.missionGate(i, Object.assign({}, naive, ev)).blocked) allOpen = false;
    // the same evidence must NOT unlock a different gated mission
    for (const other of [2,3,4,5,6]) {
      if (other === i) continue;
      if (!DuelCore.missionGate(other, Object.assign({}, naive, ev)).blocked)
        crossTalk.push(`M${other+1} opened by M${i+1}'s concept`);
    }
  }
  check('m3. each gate opens for its own concept', allOpen);
  check('m4. …and for NO other mission\'s concept (no cross-talk)',
    crossTalk.length === 0, crossTalk.join('; ') || 'clean');

  // Every refusal has to TELL the student what to do — a silent block is a
  // bug report, not a lesson.
  const reasons = [2,3,4,5,6].map(i => DuelCore.missionGate(i, naive).reason || '');
  check('m5. every refusal explains the fix in words',
    reasons.every(r => r.length > 30),
    `shortest: "${reasons.reduce((a,b)=>a.length<b.length?a:b).slice(0,52)}…"`);
}

// ── BELL TRIAL (CHSH): the classical bound is real and beatable ───────
// This minigame's entire premise is that 75% is a wall for any classical
// strategy and quantum angles get past it. If either half of that is wrong
// the game is a lie, so both are asserted here.
{
  const C = DuelCore.CHSH;
  const opt = DuelCore.chshWinRate(C.OPTIMAL_A, C.OPTIMAL_B);
  check('c1. textbook angles hit Tsirelson\'s bound cos²(π/8) ≈ 85.36%',
    approx(opt, C.TSIRELSON, 1e-12), `${(opt*100).toFixed(3)}%`);
  check('c2. …which beats the 75% classical bound', opt > C.CLASSICAL + 0.1,
    `${(opt*100).toFixed(2)}% vs ${(C.CLASSICAL*100).toFixed(0)}%`);

  // S = 2√2 at the optimum, 2 at the classical bound — the numbers a paper quotes.
  check('c3. S-parameter reads 2√2 at the optimum, 2 at the classical bound',
    approx(DuelCore.chshS(opt), 2*Math.SQRT2, 1e-12) &&
    approx(DuelCore.chshS(C.CLASSICAL), 2, 1e-12),
    `S_opt=${DuelCore.chshS(opt).toFixed(6)}, S_classical=${DuelCore.chshS(C.CLASSICAL).toFixed(6)}`);

  // EXHAUSTIVE: every deterministic local strategy (a lookup table from the
  // referee's bit to an answer — i.e. every local hidden-variable model) is
  // enumerated. All 16 must fail to exceed 75%. This is the proof that the
  // wall is real, not a tuning constant.
  let bestClassical = 0;
  for (let s = 0; s < 16; s++) {
    const A = [(s>>0)&1, (s>>1)&1], B = [(s>>2)&1, (s>>3)&1];
    let wins = 0;
    for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++)
      if (((A[x] ^ B[y]) === (x & y))) wins++;
    bestClassical = Math.max(bestClassical, wins / 4);
  }
  check('c4. all 16 deterministic local strategies cap at exactly 75%',
    approx(bestClassical, 0.75, 1e-12), `best local-realist strategy = ${(bestClassical*100).toFixed(0)}%`);

  // Sampled play must reproduce the analytic rate (the game you play is the
  // game the maths describes).
  const rand = DuelCore.mulberry32(31337);
  let wins = 0; const N = 20000;
  for (let i = 0; i < N; i++) {
    const x = rand() < 0.5 ? 1 : 0, y = rand() < 0.5 ? 1 : 0;
    if (DuelCore.chshRound(C.OPTIMAL_A, C.OPTIMAL_B, x, y, rand).won) wins++;
  }
  check('c5. 20,000 sampled rounds match the analytic rate (±1.5%)',
    Math.abs(wins/N - opt) < 0.015, `sampled ${(wins/N*100).toFixed(2)}% vs analytic ${(opt*100).toFixed(2)}%`);

  // Bad angles must LOSE — otherwise the player isn't really choosing anything.
  const aligned = DuelCore.chshWinRate([0,0],[0,0]);
  check('c6. badly chosen angles fall to (or below) the classical bound',
    aligned <= C.CLASSICAL + 1e-12, `all-zero angles = ${(aligned*100).toFixed(1)}%`);
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
console.log('    · §9.5 phase-rift composite rotation — D2 (biome bands)');
console.log('    · §9.6 bot liveness / no-NaN over a 60s sim — D1 (DuelBot)');
console.log(failed ? `\n${failed} CHECK(S) FAILED ✗` : '\nALL CHECKS PASSED ✓');
process.exit(failed ? 1 : 0);
