# QuBlitz — Transfer Test (pre/post instrument)

*Status: drafted, versioned, NOT yet PI-reviewed. Per `HANDOFF.md`'s human-actions list, PI
review of this instrument is a required open step before any classroom use — this document is
the reviewable artifact, not a claim that review has happened. The in-game 3-question variant
(toggleable, off by default — see `quantum_chess.html`'s SETTINGS menu) mirrors questions 1, 3,
and 5 below.*

**Purpose:** measure whether playing QuBlitz transfers to reading real quantum-mechanics
behavior, not just whether a student can win the game. The bar (per the council finding this
instrument answers): *can a player who mastered the game predict a simulator plot they've never
seen, and vice versa?* Give this once before a student's first QuBlitz session and once after —
same five questions, no answer key visible to the student either time.

**Format:** one page, five short-answer questions, ~10 minutes. Print or hand out as a PDF/plain
text; no special software needed to administer it.

---

**Name / ID (per your class's own consent & anonymization policy — this instrument itself
collects nothing electronically; see `docs/DATA_AND_CONSENT.md`):** _______________________

**Date:** _____________  **Pre-session ☐  Post-session ☐**

---

**1. The Born rule.** A game unit is at 80% charge and attacks. What's the actual chance the
attack lands, and why that number specifically?

_______________________________________________________________________________

**2. Superposition.** What does it mean, physically, for a qubit to be "on the equator" of the
Bloch sphere rather than at one of the poles?

_______________________________________________________________________________

**3. Decoherence (T₁).** A fully-charged unit is left alone for several turns and its charge
drops. Name the real physical process this represents, and explain in one sentence why it
happens to real qubits (not just game units).

_______________________________________________________________________________

**4. Relative phase.** Two qubits can have the exact same measurement probability in the
standard (Z) basis, yet behave completely differently if measured in a different basis. What
property distinguishes them, and what real operation changes it without changing charge?

_______________________________________________________________________________

**5. Transfer item.** Below is a plot with no title or axis labels: a single curve that starts
high and decays smoothly toward zero over time, with no discontinuities. *(Administer this by
handing the student an actual unlabeled charge-vs-time or population-vs-time plot from the Qubit
Simulator's Physics Lab / diagnostic screen — same shape QuBlitz's own Physics Lab screen
produces via `runDecoherenceDiagnostic()`.)* Which in-game behavior does this curve most likely
correspond to, and separately: if you were instead shown a screenshot of a QuBlitz unit's charge
bar draining over several idle turns, what real simulator plot would you expect it to match?

_______________________________________________________________________________
_______________________________________________________________________________

---

## Scoring notes (for whoever administers this, not the student)

This is a transfer instrument, not a trivia quiz — score for *conceptual correctness*, not exact
wording:

- **Q1** — correct answer names the Born rule / |β|² / "population in |1⟩" explicitly, not just
  "because that's the charge number."
- **Q2** — correct answer describes a genuine quantum superposition (both |0⟩ and |1⟩
  simultaneously present in the state), not "it's half health" or a game-mechanic description.
- **Q3** — correct answer names T₁ relaxation / amplitude damping and connects it to the excited
  state being physically unstable, not "the game punishes waiting."
- **Q4** — correct answer names relative phase (or explicitly "the sign/complex phase of the |1⟩
  amplitude") and names a phase gate (Z/S/T) or a basis change (GUARD's X-basis measurement) as
  what changes it.
- **Q5** — this is the actual transfer bar. Full credit requires the student to connect the
  *shape* of the curve (exponential decay) to decoherence in BOTH directions — recognizing it
  from an unlabeled simulator plot, and predicting the simulator would show the same shape from
  an in-game observation. Partial credit for getting one direction but not the other; that
  asymmetry is itself useful data (transfer often isn't symmetric on a first pass).

**Aggregate what matters:** the delta between pre and post per question, not the raw post score
— a instrument that shows large pre→post gains on Q1/Q3 (mechanics the game repeats constantly)
but no gain on Q5 (the actual transfer item) would be an honest, useful, humbling result, not a
failure of the instrument.