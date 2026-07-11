# QuBlitz — Status Report & Outstanding Work (2026-07-11, updated session 2)

*Companion to `HANDOFF.md` (task-level detail) and `.cycle/STATE.md` (live cycle status) — this
file summarizes both for reuse in PR descriptions and maintainer communication. It does not
supersede either. See also the [visual version](https://claude.ai/code/artifact/7246fefa-ff39-4409-94f8-c21504c120c0) with embedded before/after screenshots.*

## Session housekeeping

- No stray `streamlit`/`node`/Playwright processes were running at either session's start —
  nothing to terminate.
- Two separate accidental VS Code "Synchronize Changes" clicks (one per session) were
  independently verified safe both times: clean working trees, no stashes, no dangling commits,
  local `HEAD` matching GitHub exactly via a live `git fetch`. Nothing lost either time.

## Where this stands

Phases A–E (frontend display-contract remediation + backend security/process) are code-complete
and verified. Since the first version of this report, three more things closed: **BE-8** (both
repos + the fork's linked worktree relocated from the iCloud-synced Desktop path to
`~/Developer/`, verified via `xattr` to be genuinely outside iCloud's reach), **UP-5** (the dead
`utils/sonify.py`/`utils/sound_to_image.py` files are now a real live "Convert a sound file"
feature on the Sonify page, not deleted-or-ignored), and **GD-1** (the bot-difficulty gap
narrowed from 27.5% to 44.0% loss rate via root-cause diagnosis, plateauing at a confirmed
structural ceiling — see below). What remains: **UP-0**'s maintainer issue is drafted and ready
for your review (`docs/UP-0_DRAFT_ISSUE.md` in the fork) but not posted — the one genuinely
outward-facing action left — and four already-tested PRs are sitting ready for a push-and-open
decision.

## Phase ledger

| Phase | Scope | Status | Verified by |
|---|---|---|---|
| A | Display contract — delta-time animation, DPR-aware canvas, input-eating fix, text legibility floor (FE-1..4) | ✅ Done | qphysics + live_regression_check, live in Chromium |
| B | Self-hosted fonts, typography sweep, real contrast fixes, filter removal (FE-5..8) | ✅ Done | offline_check + contrast_check, 0/0 failures |
| C | Phone interstitial, board-void layout, Sage/log bugs, gate-menu language, progressive disclosure (FE-9..13) | ✅ Done | capture_responsive at 5 widths; 0px void re-measured 2026-07-11 |
| D | Acceptance harness — timing, offline, contrast, embedded-iframe capture (FE-14a–d) | ✅ Done | all 4 scripts run clean against the live fork |
| E | Sage proxy removed, background-canvas cost, app.py embed fixes, config.toml, vendor-sync CI, repo relocation (BE-1..9) | ✅ Done | BE-8 closed 2026-07-11 |
| F | Page contract, landing rebuild, perf gating, cold-start diet (UP-0..5) | 🟡 4/6 | UP-1, UP-3, UP-4, UP-5 done; UP-0 drafted (not posted); UP-2 blocked on it |

## PR packaging status

| PR | Branch | Contents | Readiness |
|---|---|---|---|
| PR-A | `arena-c03-fe` (game repo) | C03 incentive/input batch + Phases A–D + BE-3/4 riders + GD-1 re-tuning | Pushed to `origin` — awaiting merge go-ahead |
| PR-C | `ci-vendor-check` (fork) | BE-7 vendored-copy CI equality check | Committed — needs push |
| PR-D | `platform-page-contract` (fork) | UP-1 shared `page_header()` across 9 pages | Committed — needs push |
| PR-E | `platform-home` (fork) | UP-2 landing page rebuild | Blocked on UP-0 |
| PR-F | `platform-perf-gating` (fork) | UP-3 perf gating + UP-4 measured numbers | Committed — needs push |
| PR-G | `main` directly (fork) | UP-5 Sonify sound↔image feature (shipped as a live feature, not a lazy-import diet — no cold-start cost existed to fix) | Done — **landed on `main`, not its own branch, see note below** |

"Ready" PRs are fully tested and committed but intentionally not pushed — every hard constraint
in this project gates pushes/opens on an explicit go-ahead.

**Packaging note worth a decision before anything pushes:** UP-5 and the UP-0 draft doc were
committed directly to fork `main` (not a dedicated branch) — they came out of the same
investigative session and there wasn't an obvious separate-PR home for either at the time. Fork
`main` is now 27 commits ahead of `origin/main` (was 24 before this session). This doesn't block
anything since nothing's pushed, but if UP-5 should be its own reviewable PR rather than folded
into whatever eventually merges `main`, say so before the push step — it can move onto its own
branch first.

## Screenshot evidence, before → after

*Full-resolution originals in `_arena_screenshots/`; paths below are relative to this file.*

| Screenshot | What it shows | Maps to |
|---|---|---|
| `../_arena_screenshots/fork_home.png` | **BEFORE.** `home.py` today: two logos, an outbound FitzLab link, ten undescribed page links — including the VPN-only Custom Qubit Query tool with no warning. | UP-2 / PR-E (blocked on UP-0) |
| `../_arena_screenshots/fork_laser_heating.png` | **AFTER.** Laser Heating Calculator with the new shared `page_header()` — icon, title, group caption, divider. | UP-1 / PR-D (ready to push) |
| `../_arena_screenshots/fork_dilution.png` | **AFTER.** Same header contract on Dilution Refrigerator Noise Explorer — one helper driving all 9 pages instead of ad hoc headers. | UP-1 / PR-D |
| `../_arena_screenshots/390px.png` | **AFTER.** Phone interstitial — an explicit "built for laptop/tablet" message + "try anyway" link, replacing a silently-broken sub-3px-effective-text board. | FE-9 (shipped, part of PR-A) |
| `../_arena_screenshots/embedded-1440px.png` | **VERIFICATION.** Arena rendered live inside its real Streamlit iframe: one iframe, correct height, no clipping, survives a rerun. (Visible "set QB_SAGE_PROXY_URL" banner text is stale copy on unmodified fork `main` — already fixed on a separate, not-yet-merged branch.) | FE-14d |
| `../_arena_screenshots/1440px.png` | **AFTER.** 0px measured board-void at a realistic 1440×900 viewport, all 4 supported widths. | FE-10 (closed 2026-07-11) |
| `../_arena_screenshots/fe10_tall-half-snap.png` | **KNOWN EDGE CASE.** A half-snapped/portrait-tall browser window still shows a gap — needs a bigger "panels as satellites" restructure, deliberately left as documented debt. | FE-10 (not chased further) |

## What changed this session (BE-8, UP-5, GD-1)

- **BE-8 — repo relocation.** Both repos and the fork's linked worktree moved from
  `~/Desktop/Academics/Projects/...` (iCloud Drive's Desktop & Documents sync) to
  `~/Developer/...`. The worktree was cleanly detached and re-added rather than moved directly —
  a linked worktree can't survive its main repo moving out from under it via plain `mv`. Verified
  via `xattr` that the new location carries no `com.apple.icloud.desktop` tag. One stale
  absolute-path reference this move broke (`docs/PR_REVIEW_GUIDE.md` in the fork) was found and
  fixed in the same pass.
- **UP-5 — Sonify sound↔image.** `utils/sonify.py`'s `generate_audio()` was labeled "placeholder
  logic" in its own comment and strictly worse than what `Sonify.py` already built independently
  — removed as a would-be regression, not wired in. `utils/sound_to_image.py` was a real,
  valuable one-off batch script (it made the GW150914 gallery images from actual LIGO audio,
  still in `utils/sound_files/`) that had just never shipped as a feature — extracted into
  `audio_to_image_array()` and wired into a new "Convert a sound file" mode. `librosa`/
  `soundfile` are lazy-imported only on that path. Live-tested against real audio via a
  throwaway venv + Playwright; caught and fixed a real bug along the way (Streamlit's JPEG
  encoder caps out at 65,500px — a long clip's raw sample count blew past it before
  `audio_to_image_array()` capped output width to 16384 via block-averaging).
- **GD-1 — bot-difficulty tuning.** Instrumented the harness instead of guessing again: the
  bot's attacks already crit 3× more often than X-only's own (55.1% vs 16.5%) — the punishment
  mechanic works — but the bot fired 40% fewer attack attempts overall, because it shared
  X-only's own 0.6 attack-readiness bar on top of spending turns guarding. Lowered the bot's own
  bar to 0.45; X-only's loss rate rose from 27.5% to 44.0%, and the bot's own expected damage per
  attempt rose too (0.79→1.04). A grid search over attack-threshold × guard-rate ×
  threat-detection-bar afterward found the result is flat across guard/threat tuning and moves
  only with the attack threshold, which itself plateaus across 0.40–0.50 — a real structural
  ceiling under bot-AI-only scope, not an under-explored parameter. The 65% bar is not fully met;
  closing the rest needs a change outside AI-tuning scope (combat math, unit count, turn economy)
  that would affect PvP/human play too. Full diagnostic trail in
  `tests/bot_guard_harness.test.js`'s own tuning note.

## What's still open

### Blocked on you
- **UP-0 — Review, then post the maintainer buy-in issue on `mvwf/qublitz`.** Drafted in full at
  `docs/UP-0_DRAFT_ISSUE.md` in the fork (committed, not posted). Covers the landing rebuild,
  platform theme, and Custom Qubit Query naming. Unblocks PR-E. Nothing goes to GitHub until
  you've read it and say go.
- **Push + open PR-C, PR-D, PR-F; merge PR-A.** All four are fully tested and already committed
  on their own branches — just not pushed, per the no-push-without-go-ahead rule. Read the
  packaging note above (UP-5 on `main`) before this step.

### Carried forward, not blocking anything above
- **GD-1** — narrowed substantially (27.5%→44.0%), not fully closed; see above for why the
  remaining gap needs a scope decision, not more AI tuning.
- **PED-1..5 / BR-1..4 / EV-1..4 / GOV-2..4** — pedagogy (Bloch labels, notation on-ramp,
  glossary), simulator bridges, learning-evidence pilot instrument, architecture map, and
  accessibility beyond contrast (keyboard-only play, screen-reader narration — peer review flags
  this as likely legal exposure for a university deployment). None started; none block a PR above.

## Recommended sequence

1. **Decide on UP-5's branch hygiene** — confirm whether it staying on fork `main` is fine, or
   move it to its own branch first, before anything gets pushed.
2. **Push and open PR-C, PR-D, PR-F; merge PR-A** — four independently-scoped, already-tested
   PRs, the lowest-risk action available right now.
3. **Review and post the UP-0 draft** — unblocks PR-E, the landing rebuild.
4. **Revisit the pedagogy/governance backlog only after the above land** — none of it blocks,
   all of it is safe to defer.
