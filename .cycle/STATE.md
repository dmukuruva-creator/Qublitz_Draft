# Cycle state
cycle: 03
phase: ship
waiting: BE-8's iCloud relocation (human action) — the other blocker, "upstream PR #28 clears",
  is DONE: #27 and #28 both merged 2026-07-04, discovered stale here 2026-07-09 (see HANDOFF.md's
  correction callout). Fork's local `main` fast-forwarded to `upstream/main` same day.
goals_locked: true
last_updated: 2026-07-09
note_cleanup_pass: |
  2026-07-06 — user requested "pressure-test, debug, clean up, final PR". Findings + actions
  (all in the game repo only; fork untouched, #27/#28 still open upstream):
  1. GD-2's X-lock was PROVEN a no-op (off-by-one: lockedUntilTurn=turnCount+2 vs strict `>`;
     0 activations in 182,310 instrumented checks across 600 harness games). Fixing it (+3)
     measurably breaks the game (171-200/200 draws — re-charge loops). Mechanic REMOVED
     (game + harness + UI + copy); GD-2's bar re-verified passing via the GD-1 GUARD fixes
     alone (bit-identical direct matchup 70/118/12). See HANDOFF GD-2 + harness tuning note.
  2. ~143KB (26%) dead code removed from quantum_chess.html: retired biome system (ASSET_SNOW,
     ASSET_TILES, imgGrass/imgSnow/imgTiles Image objects, initBiomeToggle, biome CSS,
     isSnowBiome/activeBiomeImg/alternateBiomeImg, DECOR_SRC) + never-drawn bg NPC wanderers
     (_drawPed, bgNPCs, NPC_COLORS). ASSET_GRASS kept (live: boot-screen backdrop).
  3. Phone-width (390px) defects found by live play and fixed: sage-bar text garbling
     (line-height:0 inherited from #canvas-wrap collapsed wrapped lines onto one baseline —
     fixed via explicit line-heights + nowrap/ellipsis name + opaque footer + compact <=560px
     type), kb-hint ribbon suppressed on touch-only devices, vote badge hidden at phone width,
     canvas-wrap bottom padding 72->84px so the 82px sage bar stops covering the board row.
  Verification: qphysics + mission_shield + debrief + coherence_budget green; bot_guard has
  only its known documented GD-1-bar failure; capture_responsive clean at all 5 widths;
  full Playwright pressure-test (desktop flow, GUARD persistence, missions 4/5/6 shields,
  touch tap-through, 44px menu rows) passing; zero console errors.
note: C02 recap (unchanged): C02-T9 DONE, PRs #27 and #28 open against mvwf/qublitz, awaiting
  upstream review/merge. Per the user's explicit instruction this session, NOTHING touches the
  fork's `arena-pr` branch (sync, docstring, commits) until #28 clears.

  C03 (this cycle): per HANDOFF.md's own suggested cycle mapping, scoped to Phase 1 (incentive
  design, GD-2..GD-5) + Phase 3 (input/devices, IN-1..IN-4), confirmed with the user up front.
  All 9 tasks are CODE-COMPLETE with passing tests in the game repo (`QuBlitz Project/`,
  quantum_chess.html + tests/); per-task implementation notes are in HANDOFF.md's checkboxes.
  Additionally, at the user's follow-up request this same session:

  1. **GD-1 was actually fixed**, not just re-tuned. Root cause (found by tracing an exact
     ply-by-ply sequence): `endTurn()` cleared a side's own `guarding` flag in the SAME ply it
     was set, before the opponent's very next turn ever happened — GUARD had never protected
     anyone, for any role, since its original commit. The previous session's conclusion
     ("warriors have no GUARD lever, inherent ~50/50") was itself downstream of this bug, not
     the true root cause. Fixed: the clear now runs for the new side right after the turn flips.
     GUARD was then extended to every role (was guardian-only) — quantum_chess.html's
     `GATE_INFO`/`openGateMenu`/keyboard/crowd-vote/`BotAI.chooseAction` all dropped their
     `role==='guardian'` gate. This immediately exposed a SECOND bug (guard-preference firing on
     any adjacent enemy, not a genuinely charged threat — traced: a bot that never once chose
     ATTACK in 30 plies, 0/200 games won), fixed by narrowing the trigger to `threat`. Both
     fixes verified live in Chromium via Playwright (guard confirmed to survive into the
     opponent's turn, which it did not before). Net measured result: GD-2's bar now passes
     clearly (mixed ~59-65% vs X-only, was ~48%); GD-1's own stricter bar (X-only loses ≥65% to
     the Medium bot) is substantially improved (was 38.5% loss, now ~26-30%) but not fully met —
     documented as a live balance/turn-economy question in tests/bot_guard_harness.test.js, not
     a broken mechanic anymore. Two further tuning attempts were tried live and one was reverted
     after it measured worse — not pushed further past that point (diminishing-returns judgment
     call, consistent with this file's established practice this session).
  2. **Stray duplicate files removed in both repos.** Every untracked `<name> 2.<ext>` file
     (game repo: `tests/bot_guard_harness.test 2.js`, `node_modules 2/`; fork repo: 12 files
     including `pages/QuBlitz_Arena 2.py`, `pages/_assets/quantum_chess 2.html`) was verified
     byte-identical to its real counterpart (or, for the one that differed slightly, the real
     file was first confirmed to match the fork's git HEAD exactly) before deleting — no data
     loss risk. This also removed the duplicated "QuBlitz Arena 2" entry from the live Streamlit
     nav sidebar (it was a side effect of the stray page file). If new `<name> 2.<ext>` files
     reappear on their own between sessions, that's a live iCloud-sync signal, not an assistant
     artifact — flagged to the user.

  Verification: `node tests/qphysics.test.js` green (hard gate, unchanged). All 4 new/extended
  harness test files green except bot_guard_harness's one remaining, now-much-smaller,
  documented gap (GD-1's ≥65% bar). `node tests/capture_responsive.js` clean at
  390/640/768/1024/1440px. GUARD-availability fix live-verified via Playwright (see above).

  NOT done / explicitly deferred, per user instruction — WAIT for PR #28 to clear before any of:
    1. Copying quantum_chess.html's changes to the fork's vendored `pages/_assets/quantum_chess.html`
       (the CLAUDE.md "golden rule") — still LOCAL ONLY in the game repo, nothing committed,
       nothing pushed, no PR opened.
    2. Writing the IN-4 rerun-persistence finding into `pages/QuBlitz_Arena.py`'s docstring.
    3. Any other edit to the fork's `arena-pr` branch.
  Also still unstarted (out of this pass's confirmed scope): HANDOFF.md's Phase 2
  (onboarding/jargon), Phase 4 (control-layer bridge), Phase 5 (evidence of learning), Phase 6
  (governance).
