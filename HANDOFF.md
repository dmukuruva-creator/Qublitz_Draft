# HANDOFF — QuBlitz duel/game repository

**Updated:** 2026-08-22
**Scope:** current execution state only; historical ledger archived at
[`docs/HANDOFF_HISTORY_2026-08-20.md`](docs/HANDOFF_HISTORY_2026-08-20.md).
**Cross-repository authority:** [`../HANDOFF.md`](../HANDOFF.md). Read the project `GOALS.md`,
`.cycle/STATE.md`, and `AGENTS.md` before assigning work.

## Stop state

This repository is not authorized for feature implementation. The project remains at Gate 0;
`GOALS.md` is unratified, and D-001 covers maintenance only. The 2026-08-07 PI demo result, arcade
pivot, canonical release line, keyboard-aim model, and simulator-to-game T1/T2 behavior are still
human inputs. Do not push, open a PR, deploy, delete branches/worktrees, or contact anyone without
explicit live approval.

## Verified checkout

| Field | Value |
|---|---|
| Branch | `echo-siege-fix` tracking `QuBlitz/echo-siege-fix` |
| HEAD | `71a12bfd7054408b387671990071b1933fed09e3` |
| Pre-handoff-edit state | clean; 0 ahead / 0 behind tracking branch |
| Game artifact | `quantum_chess.html`, 4,500 lines |
| SHA-256 | `7ca113a289bad85069e131ad8135bec5a046b8382f2f9822291745e211248f76` |
| Product represented | Photon Duel, seven training missions, Bell Trial, Echo Siege, Physics Lab |

This is the current standalone game candidate, not a human-ratified release baseline. The sibling
platform currently vendors a different retired board product; see its handoff.

## Verification ledger — last executed 2026-08-20

- `npm test` — PASS: qphysics self-test 8/8 plus exponential/T1/Bell/guard/Rabi checks.
- `npm run test:duel` — PASS: 74 checks; one explicit pending case,
  `Phase-Rift composite rotation D2`.
- `npm run contrast` — PASS: 14/14 current DOM/curated checks, with the coverage limitation below.
- `npm run offline` — PASS: zero external requests/failures; three embedded fonts.
- `npm run live-check` — PASS: 30/60/120 FPS, DPR 1/2 pointer, reduced motion, hidden tab.

Green is not release evidence yet. Browser scripts still contain retired selectors/palette assumptions
and do not exercise key release, touch, gamepad, or a complete current-mode path.

## Production blockers in order

### D0 — human direction and branch baseline

Record whether the 2026-08-07 demo occurred, what was shown, the PI response, and the go/no-go on
the arcade pivot. Then name the release branch/commit and dispose of every other branch. Do not
infer this from commit history.

### D1 — held-key lifecycle is broken

The document registers `keydown` only (`quantum_chess.html:2194-2199`). `DUEL.onKey` stores held
movement (`:3294-3338`) and the frame loop continuously reads it (`:2644-2649`). No `keyup`, blur,
visibility, pause/modal, or mode-exit path clears held state.

**Acceptance:** browser automation presses and releases movement, advances frames, and proves new
acceleration stops; blur/visibility/pause/mode exit also clear every hold action.
**Falsifier:** any released or focus-lost action remains latched.

### D2 — physical inputs are not an action system

Aim, fire, and self-pulse are mouse-only; self-pulse is right-button-only. Bell and Echo implement
separate hard-coded key dispatchers. There is no touch/pointer adapter, gamepad API, remapping,
dead-zone/reconnect behavior, device glyphs, binding persistence, or one-handed route.

After D1 and the human keyboard-aim decision, create semantic hold/press/vector actions and adapters
for keyboard/pointer and the approved controller/device matrix. Mechanics must not read physical
keys. One binding manifest must drive behavior, HUD keycaps, help/wrapper copy, and tests.

**Acceptance:** two adapters produce identical action frames; changing one binding updates behavior
and displayed help with no second edit.
**Falsifier:** reconnect/focus loss latches input, or a keyboard-only user still cannot aim, fire,
and refocus.

### D3 — accessibility surface is mostly declarative

The canvas label describes Photon controls only. `#a11y-status` exists but is not updated through a
round; assertive announcements are sparse export/quiz/leaderboard events. Modals lack dialog/focus
semantics. No complete no-mouse route exists.

Deliver focus-managed dialogs, mode-aware instructions, meaningful state/outcome announcements,
reduced-motion/flash/audio/contrast settings, and a scripted keyboard-only training completion.
Reuse only relevant announcement/live-region ideas from branch `arena-accessibility`; its retired
board navigation is not portable.

### D4 — the T1 bridge claim is false as written

Imported simulator state updates `GAME.decoRate` near `:4424-4454`, used by the Physics Lab diagram.
Live duel decay uses fixed `DuelCore.K.T1_S/T2_S` near `:1424-1429` and runtime calls near
`:2675-2681`. Human decision: wire a documented match configuration into `DuelCore`, or remove the
claim and label the comparison illustrative.

**Acceptance if wired:** deterministic tests prove an imported preset changes live decay and export
records preset/source/scale.
**Acceptance if illustrative:** no user-facing copy claims the simulator controls gameplay.

### D5 — browser gates are partly retired-product theater

`tests/contrast_check.js` still searches `PLAY vs BOT`, swallows its absence, clicks an old board
coordinate, and uses an old palette. Live regression tests mouse down/up only. Replace selectors and
fixtures with asserted entry into Photon Duel, Bell Trial, Echo Siege, pause, failure, and debrief;
then cover key release, keyboard-only actions, approved touch/gamepad paths, focus, and live regions.

**Falsifier:** deleting a current hub entry still leaves the relevant test green.

### D6 — active product documentation describes a deleted board

`app.py`, `README.md`, `docs/ARCHITECTURE.md`, `docs/INSTRUCTOR_GUIDE.md`, and
`docs/DATA_AND_CONSENT.md` describe GUARD/army/Sage/schema-v2 behavior. Current local export is schema
v3 and reports duel/minigame telemetry. Rewrite only after the pivot and controls are ratified; drive
control prose from the binding manifest.

## Ordered implementation packets after authorization

1. **QB-A01 input lifecycle** — HTML input block + browser regression only.
2. **QB-A02 honest current-mode tests** — selectors, state entry assertions, contrast/a11y/input paths.
3. **QB-A05–A08 action/binding/controller/accessibility layer** — depends on keyboard-aim/device
   decisions; never concurrent with another edit to `quantum_chess.html`.
4. **QB-A03 cross-repo release/re-vendor** — depends on human-selected duel and platform baselines.
5. **QB-A04 documentation/evidence rewrite** — depends on the release and control manifest.
6. **Mechanics wave** — Phase Rift composite rotations first, then readable T-beam budget,
   spin-echo framing, measurement wager, balance simulations, and replay/debrief instrumentation.

One agent at a time may edit `quantum_chess.html`; it is the 4,500-line merge hotspot. Every packet
must name base SHA, owned/forbidden paths, acceptance test, falsifier, and no-push rule.

## Human-only queue

- Ratify/edit project goals or issue a feature-scoped exception.
- Record the PI demo outcome and arcade-pivot decision.
- Name the release line and disposition the remaining branches.
- Decide keyboard aim/assist, supported phone/tablet/controller/browser matrix, and local hot-seat
  versus any future network posture.
- Decide whether simulator T1/T2 is gameplay configuration or an illustrative bridge.
- Approve content outcomes, mechanics/balance/art direction, playtests, asset licenses/provenance,
  telemetry/retention, public identity, release window, push/PR/deployment.

## Release artifacts still missing

- Control action map + machine manifest; input ADR; controller/browser matrix.
- Game/vendor/platform SHA release manifest and changelog.
- Asset/license/source/SHA register and audio cue sheet.
- Current architecture, schema-v3 data/consent, accessibility conformance boundary, test matrix,
  threat/risk register, release/rollback/demo runbooks.
- Current desktop/tablet/controller captures and short clips; player quick-start; instructor guide;
  playtest protocol/rubric; PI/maintainer/playtester/release email drafts.

The historical handoff is evidence, not a live queue. Do not append new work below the archive.
