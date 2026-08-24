# HANDOFF — QuBlitz duel/game repository

**Updated:** 2026-08-24
**Scope:** current execution state only. Historical evidence remains in
[`docs/HANDOFF_HISTORY_2026-08-20.md`](docs/HANDOFF_HISTORY_2026-08-20.md); cross-repository
authority is [`../HANDOFF.md`](../HANDOFF.md).

## Stop state

Cycle 03 is complete locally and waiting at Gate 2 under the project `.cycle/` record. It added
durable duel records, three optional quantum-mastery challenges, a replay-oriented debrief,
complete keyboard bindings, standard browser-gamepad I/O, deterministic regressions, and an exact
local platform re-vendor. The build lock is closed pending David's review.

Do not push, open a PR, deploy, delete branches/worktrees, retune physics/balance, add a third mode,
or contact anyone without separate explicit approval. `quantum_chess.html` remains the single-editor
merge hotspot.

## Verified checkout

| Field | Value |
|---|---|
| Branch | `echo-siege-fix` tracking `QuBlitz/echo-siege-fix` |
| Cycle 03 base | `3156e0b` |
| Product | Photon Duel + seven-mission Duel Training; lab/export utilities are secondary |
| Hosted seam | `../platform/pages/_assets/quantum_chess.html` via `scripts/sync_vendor.sh` |
| Working state | Cycle 03 audited; local only; awaiting Gate 2 |

## Current controls

All mappings come from `DUEL_CONTROLS` in the canonical HTML and render in the hub/HUD.

| Action | Keyboard | Standard gamepad | Pointer |
|---|---|---|---|
| Move | WASD | left stick | — |
| Aim | arrow keys, eight-way | right stick | pointer position |
| Charge/fire | Shift hold/release | right trigger | left hold/release |
| Self-pulse | F hold/release | left trigger | right hold/release |
| Beam X/Y/T | 1/2/3 | D-pad left/up/right or shoulders | — |
| Measure | Space | A/Cross | — |
| Entangle | E | X/Square | — |
| Pause | Escape | Menu | — |

The standard controller adapter has a 0.22 radial dead zone, rising/falling button edges, safe
connect baselining, and disconnect cleanup. Blur, tab-hide, pause, mode exit, and controller
disconnect cancel held input without synthesizing a shot. Device-specific profiles, remapping,
haptics, and touch controls are deliberately outside Cycle 03.

## Current progression

- `qublitz_training_progress_v1` stores validated cleared-mission IDs.
- `qublitz_duel_profile_v1` stores validated per-mission best time/fewest shots/highest winning
  MEASURE probability, free-duel W/L/current/best streak, and earned badge IDs.
- Badges require a real win plus their production evidence: Bell-pair collapse, landed T-phase
  eigenstate break, or at least 0.5s of exposed hotspot discharge.
- The debrief preserves its physics takeaway, then shows records, mastery, and the next incomplete
  challenge. Nothing grants combat power, currency, or online rank.

## Verification ledger — Cycle 03 audit

- `npm test` — PASS: QPhysics 8/8 plus all diagnostics.
- `npm run test:duel` — PASS; one pre-existing Phase-Rift case remains explicitly PENDING.
- `npm run test:focus` — PASS 8/8.
- `npm run test:input` — PASS 3/3; keyup/blur/tab-hide drift each 0.000 px/s.
- `npm run test:mastery-input` — PASS 14/14: record ordering, invalid storage, badge predicates and
  live event paths, keyboard-only combat, focus/pause/mode-exit hold cleanup, virtual standard
  controller actions/dead zones/releases/disconnect/reconnect, valid reload, and zero console errors.
- `npm run contrast` — PASS: 37/37 DOM and all ten current canvas pairs.
- `npm run capture` — PASS: 390 px interstitial plus 640/768/1024/1440 px hub/game/debrief;
  640/1440 hub and worst-case debrief visually inspected without supported-layout clipping.
- `npm run live-check` and `npm run offline` — PASS: timing/DPR/pointer/motion/visibility checks,
  zero external requests, and real embedded fonts.
- Platform `bash scripts/verify.sh` — PASS: ruff, 26 pytest, QPhysics, and vendor equality at
  `23baf04e2f6a320f160c7a16dce60816ceaceeda7f3c3ace0912479930f5f48b`.

The gamepad test uses a deterministic virtual standard controller because no physical controller is
available in this environment. Do not convert that into a claim about a specific hardware model.

## Remaining product limitations

- Screen-reader round-state narration, dialog focus management, remapping, one-handed presets,
  touch support, and physical controller/browser certification remain separate work.
- Imported simulator T₁ drives the Physics Lab chart, not duel combat balance.
- `GOALS.md` is still human-owned and its old mission text has not been rewritten to match D-003.
- Push/PR/deployment, branch cleanup, and the PI-demo record remain David's decisions.
