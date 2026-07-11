# QuBlitz — Status Report & Outstanding Work (2026-07-11)

*Companion to `HANDOFF.md` (task-level detail) and `.cycle/STATE.md` (live cycle status) — this
file summarizes both for reuse in PR descriptions and maintainer communication. It does not
supersede either.*

## Session housekeeping

- No stray `streamlit`/`node`/Playwright processes were running — nothing to terminate.
- An accidental VS Code "Synchronize Changes" click was independently verified safe: the game
  repo's `arena-c03-fe` matches `origin/arena-c03-fe` on GitHub exactly (checked via a live
  `git fetch`, not cache); the fork's four in-progress branches (`platform-page-contract`,
  `platform-perf-gating`, `ci-vendor-check`, `fix-stale-sage-proxy-refs`) all have their work
  captured as real commits, not uncommitted/discardable edits. No stashes, no dangling commits.

## Where this stands

Phases A–D (frontend display-contract remediation) and Phase E (backend security/process) are
code-complete and verified. Phase F (upstream platform) is 3 of 5 tasks done. What remains is
mostly outside code: one GitHub issue needing your sign-off before posting (UP-0), one filesystem
move (BE-8), and four already-tested PRs ready for a push-and-open decision.

## Phase ledger

| Phase | Scope | Status | Verified by |
|---|---|---|---|
| A | Display contract — delta-time animation, DPR-aware canvas, input-eating fix, text legibility floor (FE-1..4) | ✅ Done | qphysics + live_regression_check, live in Chromium |
| B | Self-hosted fonts, typography sweep, real contrast fixes, filter removal (FE-5..8) | ✅ Done | offline_check + contrast_check, 0/0 failures |
| C | Phone interstitial, board-void layout, Sage/log bugs, gate-menu language, progressive disclosure (FE-9..13) | ✅ Done | capture_responsive at 5 widths; 0px void re-measured 2026-07-11 |
| D | Acceptance harness — timing, offline, contrast, embedded-iframe capture (FE-14a–d) | ✅ Done | all 4 scripts run clean against the live fork |
| E | Sage proxy removed, background-canvas cost, app.py embed fixes, config.toml, vendor-sync CI (BE-1..9) | ✅ Done* | *except BE-8 — human action pending |
| F | Page contract, landing rebuild, perf gating, cold-start diet (UP-0..5) | 🟡 3/5 | UP-1, UP-3, UP-4 done; UP-0, UP-2, UP-5 open |

## PR packaging status

| PR | Branch | Contents | Readiness |
|---|---|---|---|
| PR-A | `arena-c03-fe` (game repo) | C03 incentive/input batch + Phases A–D + BE-3/4 riders | Pushed to `origin` — awaiting merge go-ahead |
| PR-C | `ci-vendor-check` (fork) | BE-7 vendored-copy CI equality check | Committed — needs push |
| PR-D | `platform-page-contract` (fork) | UP-1 shared `page_header()` across 9 pages | Committed — needs push |
| PR-E | `platform-home` (fork) | UP-2 landing page rebuild | Blocked on UP-0 |
| PR-F | `platform-perf-gating` (fork) | UP-3 perf gating + UP-4 measured numbers | Committed — needs push |
| PR-G | `platform-cold-start` (fork) | UP-5 lazy imports | Blocked on a scope call |

"Ready" PRs are fully tested and committed but intentionally not pushed — every hard constraint
in this project gates pushes/opens on an explicit go-ahead.

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

## What's still open

### Blocked on you
- **UP-0 — Post the maintainer buy-in issue on `mvwf/qublitz`.** One GitHub issue proposing the
  landing rebuild, a platform theme, and VPN-tool naming, with mock screenshots. Unblocks PR-E
  and resolves UP-5's scope question. Needs your approval of the contents before it goes up.
- **BE-8 — Move both repos out of iCloud-synced folders.** Two separate `name 2.ext`
  duplicate-file incidents (`ruff 2.toml`, an empty `tests 2/` dir) trace to both working copies
  living under iCloud Drive sync. Hard prerequisite for all further Phase F work; deliberately
  left as a human action (disruptive, hard-to-reverse filesystem move).
- **Push + open PR-C, PR-D, PR-F; merge PR-A.** All four are fully tested and already committed
  on their own branches — just not pushed, per the no-push-without-go-ahead rule.

### Needs a scope decision
- **UP-5 — Sonify's dead code.** `utils/sonify.py`/`utils/sound_to_image.py` (the heavy
  `librosa`/`soundfile` imports originally blamed for slow cold-starts) are imported by nothing —
  confirmed by an exhaustive grep. No cold-start cost currently exists to fix. Whether they're
  meant to be wired into `Sonify.py` later or are safe to delete needs UP-0's maintainer sign-off.

### Carried forward, not blocking anything above
- **GD-1** — bot-difficulty tuning gap (GUARD bug genuinely fixed; balance bar improved from
  38.5% loss to ~26–30%, hasn't fully closed 65% target — a tuning question, not a broken mechanic).
- **PED-1..5 / BR-1..4 / EV-1..4 / GOV-2..4** — pedagogy (Bloch labels, notation on-ramp,
  glossary), simulator bridges, learning-evidence pilot instrument, architecture map, and
  accessibility beyond contrast (keyboard-only play, screen-reader narration — peer review flags
  this as likely legal exposure for a university deployment). None started; none block a PR above.

## Recommended sequence

1. **Push and open PR-C, PR-D, PR-F; merge PR-A** — four independently-scoped, already-tested
   PRs, the lowest-risk action available right now.
2. **Approve and post the UP-0 issue** — unblocks PR-E, settles UP-5. The one outward-facing,
   identity-touching action in the plan.
3. **Move both repos out of iCloud sync** — clears BE-8, removes the standing duplicate-file risk.
4. **Revisit GD-1 and the backlog only after the above land** — none of it blocks, all of it is
   safe to defer.
