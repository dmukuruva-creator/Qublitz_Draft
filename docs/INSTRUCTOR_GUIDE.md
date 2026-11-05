# QuBlitz — Instructor Guide

*A teaching aid without a teacher's manual doesn't get adopted (peer-review catch this doc exists
to close). Written so an instructor who has never seen QuBlitz can run a full session from this
document alone. Pairs with `docs/EV1_TRANSFER_TEST.md` (the pre/post instrument) and
`docs/DATA_AND_CONSENT.md` (what the game does and doesn't collect).*

## The intended slot

One 50-minute intro-QM section, a lab-onboarding hour, or a single homework-adjacent session.
Works as a stand-alone activity or as a companion to the Qubit Simulator / Measurement Tutorial
pages on the same platform — QuBlitz dramatizes the same physics those pages formalize (see the
game's own in-engine "SEE THE REAL PHYSICS" links, BR-4).

**What this is not:** a replacement for the simulator pages' formal content, or a validated
pedagogical intervention. The honest framing, matching the Arena page's own docstring: "the game
motivates engagement with the concepts; the formal teaching happens on the Physics Lab screen and
the concept map/cross-links... whether play transfers to durable understanding is a design goal
this project intends to measure later, not a claim asserted as proven." Use `EV1_TRANSFER_TEST.md`
if you want to actually measure that for your own class, rather than take the claim on faith.

## Minute-by-minute lesson plan (50 minutes)

| Time | Activity |
|---|---|
| 0–5 min | Administer `EV1_TRANSFER_TEST.md`, **pre-session** copy. Collect per your own class's consent/anonymization practice — this instrument is paper/PDF, the game itself collects nothing automatically (see `docs/DATA_AND_CONSENT.md`). |
| 5–10 min | Open QuBlitz together. Point out: the "PLAY IN 30 SECONDS" blurb in the main menu, the Bloch sphere panel (now labeled — PED-1), and the Gate Log (tap any counter for a plain-language explanation — PED-2/PED-4). Don't over-explain; the game's own onboarding is designed to carry this. |
| 10–35 min | Students play **Mission 1 through Mission 4** individually or in pairs (Training Programs → each mission is self-contained, ~3–5 min). These four specifically target the Born rule, decoherence, entanglement, and superposition — the exact four learning objectives `EV1_TRANSFER_TEST.md`'s Q1–Q4 probe. Missions 5–7 (Phase Gambit, Entanglement Split, Pulse Forge) are good extension content if time allows, not required for the core session. |
| 35–45 min | Debrief as a class using the question script below. |
| 45–50 min | Administer `EV1_TRANSFER_TEST.md`, **post-session** copy. If you want the in-game 3-question variant too, enable it in Settings before this block (off by default) — it's optional supplementary data, not a replacement for the paper instrument. |

## Debrief question script

Ask these in order; each maps to one mission and one transfer-test question, so a weak answer
here is a preview of where the post-test will likely also be weak — useful for you to know before
you administer it, not a rehearsal to give students the answers.

1. **(Mission 1 / Q1)** "Your attack had some percent chance to hit. Where did that number come
   from?" — listen for "Born rule" / "|β|²" / "the qubit's own state," not "random chance."
2. **(Mission 2 / Q3)** "Your fully-charged unit lost charge just from waiting. What's actually
   happening to it, physically?" — listen for T1/relaxation/"the excited state decays," not "the
   game punishes you for being slow."
3. **(Mission 3 / transfer, pairs with Q4/Q5)** "You never touched the rear Mage directly, but it
   still took damage. Why didn't that break physics?" — listen for "correlation, not
   communication" / "no signal crossed between them," not "it's linked so it just happens."
4. **(Mission 4 / Q2)** "Why did you need H before attacking, when your charge was already
   irrelevant to the shield?" — listen for "superposition is a real, distinct state from either
   pole," not "H is just a required button press."

## Common misconceptions to catch (from this project's own UX-7 finding)

- **"|1⟩ is a power-up."** It's the opposite: |1⟩ is the fragile, high-energy excited state —
  that's *why* it decays and *why* it's the state a critical hit exploits, not a reward for
  reaching it. The game's own copy was rewritten to avoid seeding this (see `HANDOFF.md`'s UX-7),
  but it's a strong enough prior that it's worth checking for directly in discussion.
- **"Charge is a resource you spend, like mana."** It's a probability, not a resource — attacking
  at 40% charge is a legitimate (if risky) choice, not "wasting" a mechanic.
- **"GUARD is a shield that blocks damage."** It's a basis change (X-basis measurement instead of
  Z-basis) — it changes *what's being measured*, not whether a hit lands. A poorly-phased GUARD
  can be *more* exposed than not guarding at all; this is a genuinely counterintuitive, and
  genuinely correct, physical fact worth surfacing explicitly.
- **"Entanglement means the two units always take identical actions."** It means a *measurement*
  on one collapses both to a correlated (not necessarily identical) outcome — and specifically,
  no *signal* passes between them (the no-communication theorem, which Missions 3 and 6 are built
  to dramatize directly).

## What you'll need

- A laptop/tablet per student or pair (the game explicitly does not support phone-width screens —
  an intentional design decision, not a bug).
- `EV1_TRANSFER_TEST.md` printed or as a PDF, one pre and one post copy per student.
- Nothing else — the game is a single self-contained file with zero network dependencies; it
  works with no internet connection once loaded.

## After the session

If you administered the transfer test, `docs/EV1_TRANSFER_TEST.md`'s own scoring notes explain
how to read the results — the interesting number is the pre→post *delta* per question, not the
raw post score, and an honest result may show real gains on some questions (the ones the game
repeats constantly) and none on others (the genuine transfer item, Q5). That asymmetry is useful
data about the game, not a grading outcome for the student.