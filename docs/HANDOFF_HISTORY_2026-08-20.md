# HANDOFF v2 — QuBlitz: Frontend + Whole-Platform Remediation

> # ⚠️ ARCHITECTURE CHANGED — READ THIS FIRST (2026-07-28)
>
> **The turn-based board game is GONE.** David retired it on 2026-07-27 and QuBlitz is now a
> collection of **adversarial quantum minigames** built on the same unchanged `QPhysics` engine:
>
> | Mode | What it is |
> |---|---|
> | **Photon Duel** | Real-time laser duel; your opponent's health bar IS their qubit's Bloch vector. Hotspots, pulse fidelity, T-charge scarcity, Bell traps, Zeno locks. |
> | **Duel Training** | The old 7 campaign concepts, rebuilt as duel scenarios whose gates REFUSE a win that didn't use the concept (`DuelCore.DUEL_MISSIONS`). |
> | **Bell Trial** | CHSH game — set four analyzer angles and push S past the classical bound of 2. |
>
> **~3,400 lines deleted**: `BotAI`, `CAMPAIGN_MISSIONS`, `missionShieldBlocks`, board rendering,
> turn logic, combat, gate menu, crowd vote, attract mode, Sage advisor, Pulse Forge, the sprite
> sheets, the side panels and the event log. `quantum_chess.html` went 7,052 → ~3,960 lines.
>
> **Consequently these harnesses were DELETED** — they tested code that no longer exists:
> `bot_guard_harness`, `mission_shield_harness`, `debrief_harness`, `coherence_budget_harness`.
> Their replacement is `tests/duel_harness.test.js` (49 checks), which carries the same
> concept-gating proof forward (cases m1–m5). `capture_responsive` and `live_regression_check`
> were retargeted at the duel; FE-3 and FE-11 retired with the board.
>
> **Still true and still load-bearing:** `QPhysics` is byte-identical (hash `88aa9cf9…`),
> `node tests/qphysics.test.js` is still the hard gate, the FE-5 font pipeline, the TY-* type
> system, QB-8/GOV-4 accessibility regions, and the EV-1/2 instructor export (now schema v3,
> carrying duel telemetry + cleared concepts).
>
> **DEMO-READY STATE (2026-07-29).** `quantum_chess.html` is 4,374 lines / 254KB.
> Three adversarial modes plus training, all reachable from the hub:
>
> | Mode | Physics it makes you use |
> |---|---|
> | **Photon Duel** (best-of-3) | Born rule, T₁/T₂, eigenstates, Gottesman–Knill, entanglement, Zeno |
> | **Duel Training** (7 missions) | one gated concept each — the win is *refused* without it |
> | **Bell Trial** | CHSH: push S past the classical bound of 2 |
> | **Echo Siege** | dynamical decoupling — time π-pulses to refocus (Hahn/CPMG) |
>
> Opponent: `DuelBot` at Cadet / Duelist / Decoherent Menace, which parks on
> eigenstates, spends T-charges to break your camp, flees to hotspots and entangles when
> losing. Defence: right-mouse **self-pulse**. Every round ends in a 3-line **debrief card**
> (what won · the concept · one tip), which is the transfer evidence the instructor export
> carries. `tests/duel_harness.test.js` is at **74 checks**.
>
> Not done, deliberately: the D1 landing screen (the hub modal serves), biomes/Phase Rift
> (D2), CC0 art and jsfxr (procedural audio stands in), and any PI/student playtesting —
> David's instruction was to finish the code without gating on it.
>
> Anything below this box that describes the board, its units, its bot or its missions is
> **historical**. Read it for the reasoning, not the current shape of the code.


*Generated 2026-07-07 from THREE 5-advisor LLM-council pressure-tests (advisor round + anonymous
peer review + chairman synthesis each). **Council #2** covered the Arena frontend — visual
design, UI/UX, accessibility, gameplay feel (Phases A–D). **Council #3** covered the game/backend
platform — Sage proxy security/cost, render performance, deployment, maintainability, process
(Phase E). **Council #4** covered the upstream `mvwf/qublitz` platform as a product — landing
page/hero, information architecture, design system, AI-feel, per-page optimization (Phase F).
All were grounded in code audits (`quantum_chess.html` 4,611 lines, `sage_proxy.py`, `app.py`,
`.streamlit/config.toml`, and the fork's `home.py` + 10 pages), computed WCAG contrast ratios,
and the captured screenshots in `_arena_screenshots/`. Every task traces to a measured defect or
a specific council finding.*

> **Supersedes:** the 2026-07-02 council HANDOFF, preserved verbatim as
> `docs/HANDOFF_v1_ARCHIVE_2026-07-02.md`. Its completed history (UX-1..7, GD-1..5, IN-1..4, PR-1..2)
> is NOT repeated here; its still-open items are carried forward near the end with their
> original IDs. `.cycle/STATE.md` remains the source of truth for cycle/gate status.

> **USER RULINGS 2026-07-07 (recorded in `.cycle/DECISIONS.md`):**
> 1. **Phones are UNSUPPORTED** — FE-9 is now "build the interstitial," not a decision.
> 2. **PR packaging is decided** — see "PR packaging plan" below: the FE batch ships on a NEW
>    branch/PR together with the previous session's code-complete C03 fixes (**PR-A**); backend
>    hardening is a separate **PR-B**; PRs #27/#28 branches stay frozen.
> 3. **Broaden platform-wide** — the user asked for broad-reaching PRs covering the upstream
>    platform (frontend, landing, hero, design, AI-feel, optimization). The council's resolution:
>    broad *impact* via narrow, sequenced, maintainer-gated PRs (PR-D..G / Phase F), NOT fat PRs.

> **PROGRESS RECONCILIATION 2026-07-07 (post-audit, same day):** re-checked every task below
> against the live code in both repos, since a doc this size risks describing work from a stale
> mental model. Result: **Phases A–E (FE-1..14, BE-1..9) are genuinely all NOT STARTED** except
> BE-1(b), which is already partly scaffolded (`SAGE_ALLOW_ORIGIN` is an env var, just insecurely
> defaulted) — see the inline note on BE-1. **Phase F has three tasks that overstate a blank
> slate** — UP-1 (4/9 pages already call `set_page_config`, ad hoc; the VPN warning exists but
> fires reactively, not proactively), UP-3 (`EP_TPD_exploration.py` already caches its meshgrid
> compute), and UP-5 (its premise doesn't hold: `Sonify.py` doesn't import the heavy libs at all
> — they're dead code in two `utils/` files nothing else imports; see UP-5's revised task text).
> Inline `**Progress check**`/`**Premise correction**` notes mark each. Also: two iCloud-style
> duplicate files matching this doc's own BE-8 warning were found and deleted — `HANDOFF 2.md`
> (this repo, stale pre-council-#2 draft, superseded by `HANDOFF_v1_ARCHIVE_2026-07-02.md`) and
> `ruff 2.toml` (fork repo, byte-identical to `ruff.toml`, gitignored/untracked). Neither deletion
> touches BE-8's actual root cause — both repos are still in an iCloud-synced folder.

> **SAGE LLM PATH REMOVED 2026-07-08 (user ruling, recorded in `.cycle/DECISIONS.md`):** rather
> than harden the Anthropic-backed proxy, the live-LLM path is deleted outright — `sage_proxy.py`
> removed, `callSageAI`/`fetch`/`window.QB_SAGE_PROXY` removed from `quantum_chess.html` and
> `app.py`. The offline heuristic Sage (`analyzePosition`) is now the only Sage, permanently — no
> Anthropic key, no proxy, no third-party API call anywhere, so there is no wallet/CORS/rate-limit
> surface left to defend. **Consequence: BE-1 and BE-2 below are MOOT (deleted, not done); PR-B is
> CANCELLED; GOV-1 and GOV-2 are MOOT; BL-5 is MOOT** (not just backlogged). BE-6
> (`.streamlit/config.toml` XSRF/CORS) is unaffected — unrelated to Sage — and needs a new PR home
> since PR-B no longer exists. Struck items below are left in place with a `[MOOT]` tag rather
> than deleted, so the reasoning trail survives.

> **PLAYWRIGHT INSTALLED PERMANENTLY + PHASE B SHIPPED 2026-07-08 (same day, later session):**
> Playwright + Chromium are now a permanent devDependency in this repo (`node_modules/` stays
> gitignored; browser binary cached at `~/Library/Caches/ms-playwright/`) — see CLAUDE.md. This
> closed the "not verified live" gap FE-1/FE-2/FE-3 were left with (all three now pass a real
> Chromium check, `tests/live_regression_check.js`) and unblocked Phase D's FE-14a/b/c, all three
> now built and green. **Phase B (FE-5, FE-6, FE-7, FE-8) is now fully done** — self-hosted/
> subsetted fonts, the full typography sweep (sub-10px declarations: zero), the actual root cause
> of both measured contrast failures (a canvas gate-card header, not the two DOM elements first
> suspected — both fixed), and the canvas filter removed. FE-4 (Phase A, still open) had one line
> item — the `#6b76a8` canvas label color — pulled forward and fixed as a side effect of FE-7's
> own zero-failures gate; the rest of FE-4 (DPR-relative font scaling, `shadowBlur` removal) is
> untouched. Full test suite green throughout, including the pre-existing documented GD-1 harness
> failure (unrelated, unchanged). See each task's own note below for specifics.

> **CORRECTION 2026-07-09 — PRs #27/#28 WERE ALREADY MERGED; "Frozen" was stale:** discovered
> mid-BE-7 by checking `gh pr list --repo mvwf/qublitz --state all` and `git fetch upstream main`,
> not by trusting this file's own prior claim. Both merged into `mvwf/qublitz` on **2026-07-04** —
> `gh` shows `28  ... MERGED 2026-07-04T02:33:49Z` and `27 ... MERGED 2026-07-04T02:33:18Z`, and
> `upstream/main`'s tip is literally `Merge pull request #28 from dmukuruva-creator/arena-pr`.
> Nobody had re-pulled since: the fork's local + remote `main` were **24 commits behind**
> `upstream/main`, still missing the Arena page, the vendored game, `scripts/verify.sh`, and
> `.github/workflows/ci.yml` entirely. Fixed: fast-forwarded the fork's local `main` to
> `upstream/main` (clean, `git merge --ff-only`, verified via `bash scripts/verify.sh` —
> ruff + the vendored physics test both pass; `pytest` fails only on a pre-existing missing
> `qutip`/BLAS dependency in this environment, unrelated). **Not yet pushed to `origin/main`** —
> that's a visible-to-others action this file's own hard constraints gate on an explicit
> go-ahead, so it's holding for one. Also found and deleted, while in there, a fresh instance of
> exactly the iCloud-duplicate class BE-8 warns about: an empty `pages/_assets/tests 2/` directory
> (untracked, 0 files) — same signature as the earlier `ruff 2.toml` incident, same root cause
> (both repos still iCloud-synced), still not the actual fix (that's still BE-8's HUMAN action).
> **Consequence for sequencing:** the "Frozen: PRs #27/#28..." line, `.cycle/STATE.md`'s "fork
> still frozen until upstream PR #28 clears" note, and Phase F's merge-prerequisite are all now
> satisfied/stale — the freeze is **lifted**. Phase F's *other* prerequisite (BE-8's iCloud
> relocation) is untouched and still genuinely blocks Phase F. This unblocked BE-7 being
> implementable for real (see its own note) — previously the only branch with a vendored file to
> check was the frozen `arena-pr`, which is why HANDOFF's original sequencing calling BE-7
> available "any time" undersold a real dependency it didn't know it had.

---

## Council #2's verdict in one paragraph (frontend)

The three pre-flagged symptoms — "inaccessible colors," "small fonts," "janky gameplay" — are
mostly downstream of **one architectural root cause: the canvas renderer has no contract with the
physical display.** It reasons in abstract units (fixed 800px backing store, font sizes in
internal canvas px, animation advanced by a per-frame constant that assumes 60Hz) and never in
real pixels or real seconds. That single defect *is* the retina blur, the 2.5–4px effective phone
text, and the double-speed animation on every 120Hz MacBook/iPad — hardware students actually
own. Fix the display contract once and items across three symptom categories collapse together.
Two more findings are blockers, not polish: the **"self-contained file" claim is currently false**
(fonts load from Google's CDN via render-blocking `@import` — offline classrooms get fallback
monospace at sizes tuned for a pixel font), and **input is silently dropped during animations**,
which combined with hardware-dependent timing makes students conclude *the physics* is broken.
The honest nuance from the audit: the core dark-palette **text contrast largely passes AA**
(QB-8 did its job — ink 17.3:1, secondary 10.2:1, muted 8.0:1); the real color debt is narrower —
white-on-indigo/red buttons (3.24:1 / 3.02:1), one canvas label color (4.49:1 at 6px), and
hue-only coding of the 10 gate counters. Finally, the pixel font was misread as a typography
system instead of an art direction: retro games were *legible* (240p on TVs = huge effective
text); Press Start 2P belongs on headings and flavor, not on 5.5–11px body copy. **Sequencing
rule (unanimous): architecture → integrity → an explicit phone ship/no-ship decision → layout;
cosmetics last or they get redone twice.** Redesign ideas (radial gate palette, live circuit
diagram) were unanimously flagged by peer review as scope expansion — they live in the backlog
section, not the remediation phases.

## Council #3's verdict in one paragraph (whole platform)

The platform's loudest risk is not code quality — it's **an open wallet**: `sage_proxy.py` as
written is an unauthenticated relay to a paid Anthropic key with wildcard CORS
(`ALLOW_ORIGIN="*"`), a rate limit keyed to the client-spoofable `X-Forwarded-For` header, no
daily spend ceiling, no shared secret, unbounded threads and an unbounded per-IP map, over plain
HTTP with deployment instructions living in a code comment. Deployed as-is, the first shared URL
or crawler drains the budget in an afternoon (Contrarian: "a public credit card"; Outsider-as-TA:
"one student with DevTools owns my bill — so the rational TA never enables the AI, and the
flagship feature dies in exactly its target environment"). Mitigating context: today the proxy
defaults to `127.0.0.1` and is not yet deployed — so this is a **deploy-blocker, not an active
breach** — but peer review's unanimous catch stands: *set a provider-side spend cap and treat key
rotation as a runbook item now; both are zero-code.* The second structural finding (First
Principles, peer-endorsed): most process pain is **one decision — there is no build artifact,
only hand-synced copies.** The vendored 4,611-line HTML, the "golden rule," the 1100-vs-920
embed-height drift, and gate rules duplicated across ≥3 surfaces (in-game strings, `app.py`
sidebar, fork Arena page) are the same bug; the *cheap* fix now is a 20-line CI equality check +
one shared height constant, and the *real* fix (single-source build) is a ticketed backlog item —
the Executor's named trap is starting that redesign as if it were a JSON extraction. Third:
performance posture contradicts the audience — `animateBg()` is a second, permanent rAF loop
painting full-viewport gradients (5 `createRadialGradient` allocations + ~330 lattice rects per
frame) that ignores `prefers-reduced-motion`, never pauses under modals or offscreen iframes, and
warms exactly the battery-powered classroom laptops the project targets; and the proposal's
"latency improvements across all pages" claim rests on 8 of 9 qutip pages never having been
profiled — audit one, then re-scope the claim. Finally, process: `.streamlit/config.toml`
*actively disables* XSRF protection, and the project's planning brain (CLAUDE.md, `.cycle/`, this
file) is not in version control while live iCloud sync has already corrupted both working repos
once ("name 2.ext" incident). Peer review's additions the advisors all missed: **student prompts
transit to a third-party API** (privacy/consent is a pilot-blocker in its own right, folded into
GOV-2), and the pilot needs a **Sage kill-switch**. The Expansionist's platform visions (shared
Sage gateway, `qphysics.js`, single-source build) were again unanimously ruled scope expansion —
backlogged, not scheduled.

## Council #4's verdict in one paragraph (the qublitz platform: landing, design, AI-feel, optimization)

The lab's platform is ten genuinely rigorous physics tools with **no platform layer holding them
together — "the site is `ls` rendered in Streamlit"** (First Principles, unanimously voted
strongest in peer review). There is no page contract: nothing a page must import, so nothing is
consistent — no theme config at all (stock light Streamlit hosting a dark neon game page), only
5 of 10 pages set a page title/config, headers are hand-rolled per page, the sidebar order is a
filesystem accident, and the landing page is 27 lines: two logos, a giant link *away* from the
site, "Welcome to Qublitz!", and ten undescribed links — including a VPN-only tool that silently
hangs for every public visitor. The Outsider's student bounced in 60 seconds ("send me the exact
page URL, not the homepage"); its PI persona supplied the political map: **yes-fast** to titles,
descriptions, VPN banners, and perf gating; **stalls** on themes, renames, and AI-on-my-pages
("wrong hints in a teaching tool land on ME"). The Contrarian's corrective on "AI-feel": the
landing reads AI-generated precisely because it is *generic* — the fix is specificity (one
screenshot + one sentence of real physics per tool), not chatbots; and putting Sage on nine more
pages before PR-B hardens the proxy is adding surface to an unsecured service. On optimization,
the measured finding: **4 of the 5 heaviest pages have zero compute gating** — the full
qutip/numpy pipeline reruns on every widget twitch (the Outsider's student: "it froze on every
slider, so I assumed I broke it") — plus a heavy dependency set on free-tier hosting that sleeps.
**Resolution of the user's "broad-reaching" ask (chairman, adopting E + C):** broad *impact*
via narrow, sequenced PRs — one small PR that *creates* the page contract, then follow-ups
against it — NOT fat PRs ("bundle it, and it sits" — the PI persona). Peer review's four catches,
all adopted as tasks: measure before/after numbers for every perf PR body; cached qutip paths
need a physics-regression guard (a cache-key bug silently serves *wrong physics* to students —
the worst failure mode a teaching instrument has); get maintainer buy-in via ONE GitHub issue
before any identity-touching code; and write the contract down (docs) so it survives the
contributor's graduation. Escalation: a NEW iCloud duplicate (`ruff 2.toml`) has reappeared in
the fork since the last cleanup — **BE-8's repo relocation is now blocking: every future PR is
contaminated at the source until the clones leave the synced folder.**

---

## PR packaging plan (user ruling — this is the PR-hygiene contract)

| PR | Branch (new) | Contents | Gate before opening |
|---|---|---|---|
| **PR-A — "Arena: input/incentive fixes + display-contract remediation"** | `arena-c03-fe` off current main | The previous session's code-complete C03 batch (GD-2..5, IN-1..4 — already tested, never committed as its own PR) + Phases A–D below + BE-3/BE-4 riders | QPhysics green; harness suite run; `capture_responsive.js` clean at supported widths; FE-14 checks green |
| ~~**PR-B — "Sage proxy hardening + deploy runbook"**~~ **[MOOT 2026-07-08]** | ~~`sage-hardening`~~ | The Sage LLM path (and `sage_proxy.py`) was deleted instead of hardened — see the callout above. BE-6 (config.toml fix) still needs a home: fold into PR-C or a small standalone PR. | — |
| **PR-C — "CI: vendored-copy equality check + repo hygiene"** | `ci-vendor-check` | BE-7 sync script + CI job; optionally BE-8 file commits | CI demonstrably fails on an induced drift, passes on sync |

**Upstream platform PRs (council #4 — broad impact via narrow PRs, per the chairman's
resolution; all fork-repo branches, all opened only after UP-0's maintainer issue):**

| PR | Branch (new, fork) | Contents | Politics / gate |
|---|---|---|---|
| **PR-D — "Page contract: config + shared header on every page"** | `platform-page-contract` | UP-1 (`set_page_config` ×5 missing pages, ~40-line `utils/ui.py` `page_header()`, VPN warning banner) | Squarely inside the agreed "visualization improvements" mandate; low politics; review story: "one helper + 10 tiny diffs" |
| **PR-E — "Front door: landing page"** | `platform-home` | UP-2 (hero line, one-sentence blurb per tool, Learn/Play/Research grouping, start-here, demote FitzLab link) — **mocked 2026-07-13, committed to the branch, not merged** | **Issue-gated for the merge** (UP-0): touches the lab's public identity; single-file diff of `home.py`, before/after screenshots now exist |
| **PR-F — "Perf: gate the four ungated pages"** | `platform-perf-gating` | UP-3 per-page recipes + UP-4's measured before/after numbers in the PR body + physics-regression guard on every cached path | Inside mandate ("latency"); must not touch anything PR #28 touches |
| **PR-G — "Cold-start diet: lazy imports"** | `platform-cold-start` | UP-5 (lazy-import librosa/soundfile/bokeh in the pages that use them) | **Issue-gated** for anything beyond import moves; no dependency removals without sign-off |
| *(theme)* | — | `.streamlit/config.toml` platform theme reconciling the Arena's identity | **Propose, don't ship** (PI stall-list): mock screenshots in UP-0's issue; ships only on explicit approval, then rides PR-D or its own micro-PR |

**Why narrow PRs (Executor + Outsider-as-PI, peer-endorsed 5/5):** a security rewrite mixed into
a display-contract review poisons both; and on a repo the lab owns, "bundle it, and it sits" —
each PR must be one reviewable story a maintainer can test in five minutes.

**Commit hygiene within each PR (from GOALS.md, unchanged):** `scope: imperative description
(ID)`, one task per commit where practical, harness/tuning evidence in the body, screenshots
attached for every visual change. Update `docs/PR_REVIEW_GUIDE.md` anchors if PR-A moves any of
its 10 anchor points.

~~**Frozen:** PRs #27/#28 branches receive nothing until they merge or the maintainer asks.~~
**[LIFTED 2026-07-09 — both merged 2026-07-04, see the correction callout above.]** The fork's
`arena-pr` checkout itself is still not to be committed to directly (any new work branches off
the now-updated `main` instead, per BE-7's own note) — but that's normal branch hygiene, not a
freeze on a still-open PR.

---

## How to use this file

Work phases in order; tasks within a phase are priority-ordered. Each task has a stable **ID**,
**where**, **what**, and a testable **done-when**. After each task: run the verification gates,
commit `scope: imperative description (ID)`, tick the checkbox.

**Two repos, one game file in two places** (unchanged from v1):

| Repo | Local path | Canonical artifact |
|---|---|---|
| Game (Qublitz_Draft) | `QuBlitz Project/` | `quantum_chess.html` (canonical) |
| Fork of mvwf/qublitz | `../qublitz/` | `pages/_assets/quantum_chess.html` (vendored copy) |

Golden rule: edit canonical first, test, then copy to the fork and run its gate. Never let them drift.

**Verification gates:**
- Hard: `node tests/qphysics.test.js` green (Node 20+).
- Visual: `node tests/capture_responsive.js` — supported widths 640/768/1024/1440px after FE-9
  (390px stays in the script only to assert the phones-unsupported interstitial renders).
- Informational: the four harness tests (`bot_guard`, `mission_shield`, `debrief`,
  `coherence_budget`) — new failures need diagnosis, known documented ones don't block.
- Fork: `bash scripts/verify.sh` before any fork push.
- **New for this batch (FE-14a/b/c, built 2026-07-08 — see Phase D):** `node
  tests/live_regression_check.js` (120Hz-equivalence + DPR/click + click-feedback-floor),
  `node tests/offline_check.js` (offline-load), `node tests/contrast_check.js` (scriptable
  contrast) — peer review's unanimous catch was that v1-style "done-whens" existed but
  *acceptance tests* didn't. All three require Playwright, which is now a permanent
  devDependency (`npm install` if `node_modules/` is missing — see CLAUDE.md).

**Hard constraints (carried from v1, two additions):**
1. No upstream PR / game-repo `main` push without explicit user go-ahead.
2. Never edit `.cycle/GOALS.md`.
3. `quantum_chess.html` stays a single file openable standalone in Chrome — **which after FE-5
   means genuinely zero network deps, fonts included.**
4. QPhysics tests stay green; extend with every mechanic change.
5. Preserve GUARD, the 30-second onboarding, and the pixel-art *art direction* (sprites, palette
   vibe) — the typography fix is a correction of the aesthetic, not its removal.
6. **NEW — the known trap (Executor, peer-confirmed): do NOT "unify the rendering."** Moving the
   `.piece-fly` DOM overlay onto canvas, dirty-rect/layered redraw restructuring, or any render
   -loop rewrite feels adjacent to the jank fix and is not — delta-time + DPR gets ~90% of
   perceived smoothness for ~2 hours. The hybrid overlay and full-frame redraw are **known,
   accepted debt. Do not touch.**

---

## Phase A — Rendering architecture: give the canvas a display contract (~1 day)

*The root cause. Everything else tuned before this is tuned against a moving target.*

- [x] **FE-1 — Delta-time animation (the single first thing to do).** **[DONE 2026-07-08.]**
  Added `_frameDt`/`_frameTicks` (computed from the rAF timestamp, clamped to 50ms) in `loop()`;
  every accumulator this task named now uses them: `advanceAnims()`'s `ft` counters use `dt`
  directly, the walk-tween uses the frame-rate-independent lerp formula exactly as specified,
  `tickParticles()`/`tickFloats()` scale their per-frame deltas by `_frameTicks`, `_t` (the sine-
  wave phase driver for pulses/beams) advances by `_frameTicks` instead of `_t++`, `_sageFt`
  advances by real `dt`, and `animateBg()` (a separate rAF loop) got its own local dt/ticks for
  its blob-drift velocities. `GAME.shake` decay and the entanglement-beam `beamFlash` decay were
  also converted (same root cause, not explicitly named in the task text but same bug). `ANIM_FPS`
  is now dead and was deleted — confirmed via `grep -n ANIM_FPS` returning nothing.
  *Verified:* qphysics + all harness tests still green (game-logic math untouched — this only
  touches rendering/animation timing); a standalone Node simulation of the lerp formula at
  60Hz/120Hz/30Hz converged to within 0.3% of the same position after 500ms, confirming frame-
  rate independence mathematically. **[LIVE-VERIFIED 2026-07-08.]** Playwright + Chromium are now
  a permanent devDependency (see CLAUDE.md environment notes); `tests/live_regression_check.js`
  implements FE-14a for real — stubs `requestAnimationFrame` with a fully synthetic timeline (no
  real-clock reads inside the measured window) and confirms `_t` advances identically at
  30/60/120Hz-equivalent cadences over 1s of simulated wall-clock (diff < 1e-10%, i.e. exact
  within float noise). Closed for real, not just simulated.
- [x] **FE-2 — devicePixelRatio-aware canvas.** ~2458 (`canvas.width = BOARD`), plus the
  background canvas (`initBg`), sage-portrait canvas, and any offscreen sprite scaling. Size
  backing stores at `size × dpr`, `ctx.setTransform(dpr,0,0,dpr,0,0)`, keep ALL game logic and
  drawing in the existing 800-unit logical space.
  **Regression trap:** input mapping at ~3337/~3418 uses `canvas.width/rect.width`, and
  `menuDims()`'s `cssScale` uses `rect.width/canvas.width` — after DPR scaling these must use
  `BOARD` (logical size), not `canvas.width` (physical), or every click lands on the wrong cell
  and the IN-1 44px touch-target fix silently breaks.
  *Done when:* board is crisp on a retina display (screenshot diff vs before); clicks land on
  the correct cell and gate-menu rows still measure ≥44 CSS px at 390px, verified live at
  dpr 1 and 2 (Playwright `deviceScaleFactor`).
  **[DONE 2026-07-08.]** Game canvas, sage-portrait canvas, and the background canvas (`initBg`/
  `animateBg`) all now size their backing store at `logical × DPR` and `setTransform(DPR,0,0,DPR,0,0)`;
  drawing code is untouched (still logical-space). Fixed exactly the regression trap called out
  above: the click handler's `scaleX`/`scaleY`, the mousemove hover handler, and `menuDims()`'s
  `cssScale` all switched from `canvas.width` to `BOARD`. No offscreen sprite-scaling canvases
  exist yet (nothing to fix there). *Verified:* syntax check + full test suite green (no game-logic
  touched). **[LIVE-VERIFIED 2026-07-08.]** `tests/live_regression_check.js` launches Chromium at
  `deviceScaleFactor` 1 and 2: the backing store is fixed at `BOARD*DPR` (not `rect.width*DPR`),
  so it's always over-resolved relative to CSS size, never under — delivered pixel density
  (canvas.width/rect.width) measured 1.23 at dpr1 and 2.46 at dpr2, both ≥ target; a click at both
  densities correctly selected the intended board unit, confirming the regression trap fix holds.
- [x] **FE-3 — Stop eating input during animations.** Bot turns chain `waitForAnims(200)` +
  `setTimeout(120/300)` while clicks are silently ignored (Outsider: "taps felt dead — I decided
  it was broken at second 15"). Either queue the click and replay it when animations settle, or
  give immediate feedback (cursor/brief "…" pulse on the selected panel). Queue is preferred;
  feedback is the floor.
  *Done when:* a click during a bot animation either takes effect when the board settles or
  produces visible feedback within 100ms — never silence; verified via Playwright with a click
  fired mid-animation.
  **[DONE 2026-07-08 — landed the feedback floor, not the queue.]** A queue-and-replay was
  considered and rejected for this pass: replaying a stale click's row/col against a board the
  bot just changed (unit moved/died, tile now occupied) risks silently executing an action the
  player never actually intended — a worse failure mode than a dropped click, and this codebase
  has already needed several turn-logic bugfixes (GD-1/GD-2) from exactly this kind of subtle
  state assumption. Landed instead: a click during the bot's turn now pushes an immediate
  floating-text cue ("⏳ bot is acting…") at the click point via the same `GAME.floats` system
  combat already uses for MISS/damage text — zero new rendering machinery, fires synchronously
  in the click handler (well under 100ms), and stays visible under `prefers-reduced-motion` (no
  drift, just a fade) since this is informational, not decorative. Revisit the full queue as a
  follow-up if user testing shows the floor isn't enough.
  *Verified:* syntax + full test suite green. **[LIVE-VERIFIED 2026-07-08.]**
  `tests/live_regression_check.js` forces `GAME.turn` to the bot's color, fires a real click, and
  confirms the "⏳ bot is acting…" float appears in `GAME.floats` — measured 78-82ms end to end
  across runs, comfortably under the 100ms bar.
- [x] **FE-4 — Canvas text legibility floor.** **[DONE 2026-07-09.]** Canvas text is drawn at
  5.5/6/7/9px Press Start 2P (~2905–3086, ~2554–2560, floats) and then CSS-scaled DOWN on phones
  → ~2.5–4px effective. Reused the `menuDims()` pattern: scale canvas font sizes up by the same
  factor when the canvas is displayed smaller than native, so **effective on-screen text never
  drops below ~10 CSS px**; drop `shadowBlur: 10` glow behind any text under 14px effective (it
  destroys edge contrast); replace canvas label color `#6b76a8` (4.49:1) with `--dim` `#9aa3cf`
  (8.0:1) — this last item already landed as part of FE-7, see that note.
  Implementation: factored `menuDims()`'s inline cssScale calc out into `canvasCssScale()`, then
  added two small siblings — `canvasFontPx(basePx)` (grows a logical font size by
  `Math.max(1, 10/(basePx*cssScale))`, same growth shape as `menuDims()`'s own 44px-touch-target
  growth, floored so it never shrinks an already-adequate font) and `canvasGlowOk(basePx)`
  (`basePx*cssScale >= 14`, gates every `shadowBlur` behind text). Applied `canvasFontPx()` to
  every HUD/menu/overlay canvas text call site: the gate menu (header, chevron, label,
  description, side detail card header + description), the turn banner, the gameover overlay
  (DRAW/WINS, subtext, click-to-menu, session stats, debrief), the attack/entangle mode banners,
  the rank/file coordinates, and floating combat text (`f.size||11`) — gated every one of their
  `shadowBlur` uses through `canvasGlowOk()`. Two `wrapText()` call sites (side detail card
  description, debrief text) had their `lineHeight` scaled by the same growth factor as their
  font, so grown text doesn't overlap itself. Deliberately left untouched: the per-unit sprite
  badges (K/M faction initial ~line 2795, guardian `G` badge ~line 2841) and the well-tile `⚛`
  glyph (~line 2641) — these are icon-scale sprite decorations already sized off `CELL`, not the
  reading text this task's own line-range citations named, and QB-8 already documents the K/M
  badge as a redundant colorblind cue rather than primary information.
  **Known residual, deferred to FE-12:** the side detail card's box (`DW`/`DH`) is a fixed
  logical size, not resized here — at the extreme low end of `cssScale` (e.g. 390px, ~0.49) a
  long gate description can wrap into more lines than the card's fixed height holds. Left as-is
  because (a) resizing the card is menu-placement work, squarely FE-12's job, not this task's,
  and (b) the card only ever renders on `mousemove`-driven hover (verified: no touch/tap path
  sets `_menuHover`), so it's unreachable on the phones this scenario is worst on — and phones
  get FE-9's interstitial instead of the game regardless.
  *Verified:* full suite green — `qphysics.test.js` (untouched game logic), `contrast_check.js`
  (0/0 failures, same 11 canvas pairs), `live_regression_check.js` (FE-1/2/3 all still pass),
  `offline_check.js`, and `capture_responsive.js` at all 5 widths with zero console errors.
  Screenshots eyeballed at 390px (gate menu text now clearly legible, no overlap/clipping) and
  1440px (visually unchanged from before — confirms the growth factor is a no-op at
  near-native `cssScale`, as designed).

---

## Phase B — Typography & color integrity (~1 day)

- [x] **FE-5 — Self-host the fonts (PR-integrity blocker).** **[DONE 2026-07-08.]** Both fonts
  fetched from Google's CDN, subsetted with `pyftsubset`, and embedded as base64 `@font-face`
  rules replacing the `@import`. Press Start 2P: subsetted to all printable ASCII (every
  character actually appears somewhere in-file) plus the handful of extra Latin-range symbols
  this font's hosted face has glyphs for and that are used (en/em dash, ellipsis, ×/±/°/·/−) —
  6.7KB. Space Grotesk turned out to be served by Google as a single **variable font** (wght axis
  300-700 — the 400/500/600/700 CSS rules in the original CDN response all pointed at the exact
  same file); subsetted that one file to the Latin unicode range instead of downloading and
  embedding four separate weight files — 19.3KB, one `@font-face` spanning `font-weight: 300 700`
  covers every weight used. Total ~26KB raw / ~34.6KB base64, well under the 300KB budget. A
  couple of in-file Greek/math glyphs (ψ, ⟩ in `#sel-eq`) aren't in either font's hosted Latin
  face and already fell back to a system font before this change (verified against Google's own
  published unicode-ranges) — self-hosting doesn't change that, so they're not chased further.
  *Verified:* `tests/offline_check.js` (FE-14b, new) loads the page with
  `context.setOffline(true)` and confirms zero external/failed requests and that both fonts
  measurably render (glyph-width probe vs the generic fallback), not just that the page loads.
  Full test suite + responsive captures green, no console errors, fonts visibly correct at
  390/1440px.
- [x] **FE-6 — Typography system: pixel font is a headline voice, not a body font.**
  > ⚠️ **SUPERSEDED by TY-1..TY-5 (branch `duel-phase0`, 2026-07-26, per David's explicit
  > direction):** FE-6's classification kept Press Start 2P on buttons/panel-headers/modal
  > chrome at a 12px floor; the TY pass demotes the pixel face to display-only (boot/title
  > logos, modal h2, vote title, canvas WIN/DRAW banners, unit glyphs, FX floats — all ≥ the
  > scale's --fs-2) and moves everything dense/interactive to Space Grotesk on a 4-size
  > CSS-var scale (--fs-0..3), with Rajdhani (digits subset) as the HUD-numerals face.
  > Do not "fix" body-face buttons/headers back to pixel — that's the old rule.
  **[DONE 2026-07-08.]** Swept all 84 `font-size:Npx` declarations (CSS rules + inline styles):
  for each, checked whether its own rule/attribute also declared the pixel font — if so, floored
  at 12px (headings/labels/flavor: panel `h3`s, buttons, modal titles, TOME strings); if not
  (body font, inherited or explicit), floored at 13px (values, gate descriptions, log lines,
  tooltips, the ~15 physics-explanation paragraphs in the QPhysics/onboarding modals). Four rules
  got a full reclassification off the pixel font rather than just a size bump, per the task's own
  "values...sage text" list: `.srow .val` (stat values), `.gcnt span` (gate-use counts), `#sel-eq`
  (the quantum-state readout), and `#timer-chip` (the turn countdown) — all now `var(--body)`.
  The sage bar (the flagged phone-width 9px override) got taller instead of the text shrinking,
  per the task's explicit instruction: introduced a `--sage-bar-h` CSS var (82px → 108px) and
  moved every layout value derived from the old fixed 82px (canvas-wrap padding, `#sage-tips`
  position, timer-bar/chip position, the sage-portrait canvas) onto it, so they all move
  together; `#sage-bar-text` (the actual message content — "the primary teaching channel") moved
  to Space Grotesk at the 14px paragraph tier. The phone-width font-size overrides were deleted
  outright rather than adjusted, since the box now has room without them.
  *Verified:* `grep -o "font-size:\s*[0-9.]*px" quantum_chess.html` → zero results below 10px.
  Full test suite + `tests/live_regression_check.js` green, no console errors. 390px and 1440px
  captures re-eyeballed: sage bar visibly taller with readable message text; stat values, gate
  counts, and the state equation all render in Space Grotesk at 13px. One minor observed side
  effect: "ELITE KNIGHTS" (a `.panel h3`) now wraps to two lines at 390px width (12px pixel font
  is a bit wider than the old 11px) — cosmetic, not a regression to a working state, left for
  Phase C's layout pass (FE-10) rather than chased here.
- [x] **FE-7 — Contrast + non-hue coding fixes (the *actual* palette debt).** **[DONE 2026-07-08.]**
  Traced (a) and (b) to their actual source: both measured ratios (3.24:1, 3.02:1) come from the
  canvas gate-detail-card's colored header (`drawGateMenu()`, ~line 3040) filling with each
  gate's `GATE_COLORS` signature color and drawing white label text on top — white-on-indigo (Z)
  measures exactly 3.24:1, white-on-red (ATTACK) exactly 3.02:1, matching the audit. Fixed by
  switching that header's text to black (`#000000` clears ≥4.5:1 against all 12 `GATE_COLORS`
  values, worst case SKIP's slate accent at 8.51:1) rather than touching the shared color
  palette used elsewhere as text-on-dark-bg (already fine there). The DOM `#modal th` rule
  shares the identical white-on-`--indigo` pair (same 3.24:1) — darkened its fill to `#5a4cd6`
  (already verified elsewhere in this file at 6.11:1 with white text) rather than introduce a new
  color. `.btn-sage:hover`'s gradient had the same problem at its lighter (indigo) stop even
  though its darker stop passed — replaced both stops with colors that individually clear 4.5:1
  (6.11:1 / 7.66:1), so no point along the gradient dips below AA. (c) Confirmed non-issue: every
  Gate Log counter already has a plain-text letter label (`<div>H: <span id="cnt-H">0</span></div>`)
  — hue is a supplementary accent on the value, never the sole identifier; PED-2's tooltips are
  still a separate follow-up, not required for this task's bar. (d) Gold `#f5b73c` re-checked
  against the dark panel backgrounds (~10.5-11.3:1 across the actual gradient stops) — already
  fine, no fix needed. Found and fixed one more rgba-adjacent case while auditing: `#6b76a8`
  (4.49:1, the exact color FE-4 separately flags) was still used in 6 places (canvas label/float
  text, a `GATE_COLORS` entry, two DOM inline styles) — replaced with `--dim`'s `#9aa3cf` (8.0:1)
  everywhere, since FE-7's own done-when (zero failures across the *whole* canvas color list)
  would otherwise still fail on it.
  *Verified:* built `tests/contrast_check.js` (FE-14c) — a real Playwright DOM walk (computed
  `color` + an alpha-composited ancestor-background walk, correctly falling back to the page's
  actual dark gradient tone rather than assuming white; skips inactive/dimmed controls and
  gradient-clipped headings per WCAG's own carve-outs) plus a curated canvas fg/bg pair list
  mirroring exactly what this audit measured. Result: 69/69 DOM elements with visible text pass,
  all 11 canvas pairs pass, zero failures.
- [x] **FE-8 — Remove or justify the canvas CSS filter.** **[DONE 2026-07-08.]** Removed outright
  — no retuning needed. This also retroactively validates every FE-7 contrast fix: those ratios
  were computed against literal `fillStyle`/CSS hex values, which is only strictly accurate once
  this filter (which silently boosted rendered contrast ~10% and saturation ~12% above what the
  hex math assumed) is gone; removing it makes the raw-hex math and the actual rendered pixels
  agree, instead of the filter masking a slightly-different reality.
  *Verified:* full test suite green; before/after 1440px captures visually compared — no
  perceptible difference (colors were already well-tuned without the filter's boost);
  `tests/contrast_check.js` re-run clean (0 DOM / 0 canvas failures).

---

## Phase C — Layout & flow (2–3 days, LAST — after A/B land; phone ruling: unsupported)

- [x] **FE-9 — Phones-unsupported interstitial (USER RULING 2026-07-07: option b — decided,
  recorded in `.cycle/DECISIONS.md`).** **[DONE 2026-07-09.]** Added `#phone-gate`: a full-screen
  overlay in the boot screen's own art direction (same gradient background, pixel-font logo
  gradient), gated purely by a `@media (max-width: 599px)` rule — no JS needed to show it, only
  to dismiss it. Copy is exactly the task's own wording: "QuBlitz is built for laptop/tablet
  screens — the quantum battlefield needs the room. Open this page on a bigger screen and the
  arena is waiting," plus a "Try anyway →" link. Dismissal uses `sessionStorage` (not
  `localStorage`) so it's genuinely session-scoped, not permanent, per the task's own
  "never brick the page" requirement — a closed/reopened tab sees the gate again; a private-mode
  tab where `sessionStorage` throws just leaves the click handler as a no-op, CSS remains the
  only source of truth for visibility either way. The `.dismissed` class always wins over the
  media query on CSS specificity (`#id.class` beats a bare `#id`) regardless of source order, so
  a live resize during a dismissed session can't re-trigger it. Sits above `#boot` (z-index 9500
  vs 9000) so it pre-empts the boot screen too on a phone-width load.
  **Concrete follow-through, both already satisfied:** the 9px phone-width sage-bar font
  overrides were already deleted outright by FE-6 (2026-07-08), before this task started — see
  FE-6's own note. `tests/capture_responsive.js` now splits `PHONE_WIDTHS=[390]` (interstitial
  contract only — asserts `#phone-gate` renders, screenshots it viewport-only since it's
  `position:fixed` and that's what a real phone user actually sees, clicks "try anyway", asserts
  it's then hidden) from `SUPPORTED_WIDTHS=[640,768,1024,1440]` (the original gameplay-setup +
  screenshot flow, unchanged, plus one added regression guard: asserts `#phone-gate` computed
  `display` is `none` at every supported width, so a future breakpoint edit can't silently start
  showing the gate on a supported width without a test noticing). Both lists are documented in
  the script's header comment.
  *Verified:* full suite green — `qphysics.test.js`, `contrast_check.js` (0/0 failures),
  `live_regression_check.js` (FE-1/2/3 unaffected), `offline_check.js` (still zero external
  requests — the gate is inline CSS/HTML/JS, no new deps), and the rewritten
  `capture_responsive.js` — all 5 widths ✓, phone-gate-not-shown guard passes at all 4 supported
  widths, phone-gate-shown + dismiss-works both pass at 390px. 390px screenshot eyeballed: clean,
  on-brand, no game content bleeding through.
- [x] **FE-10 — Board-first desktop layout (kill the 60% void).** **[RESOLVED 2026-07-11 —
  the 2026-07-09 "extreme heights" gap turned out to be mostly the test convention, not the
  layout; see the re-measurement at the end of this entry. Original 2026-07-09 landing notes
  below, unedited, so the reasoning trail survives.]**
  **Landed:** (a) `#game-canvas`'s flat CSS width cap raised 800px → 900px — the actual
  mechanism suppressing board growth on any viewport taller than ~1050px (common: a half-
  screen-snapped browser window, a vertical secondary monitor). First tried 1050px and caught a
  real regression live (screenshotted): `#canvas-wrap` is `flex-shrink:0`, so a canvas that big
  forced both side `.panel`s below their own `min-width:188px` floor and off the visible row.
  Recomputed the actual safe ceiling from `#ui`'s own `max-width:1350px` minus 2 panels at their
  floor minus gaps (`1350 − 2×188 − 2×12 = 950`) and backed off further to 900px for comfortable
  slack, not a knife's-edge fit. (b) Removed `min-height:100vh` from `html,body` — the literal
  "phantom spacer" this task's own text named: it forced the page to be at least viewport-tall
  even when content was shorter, and did so on the *root* element specifically, where
  `scrollHeight` has a browser quirk (always ≥ viewport height regardless of actual box height)
  that made this bug invisible to a naive `scrollHeight` check — confirmed the real fix by
  measuring `#root`'s `getBoundingClientRect().height` directly instead (now correctly tracks
  content, e.g. 1132px, regardless of viewport height).
  **Honest finding from testing (b) that changes how this task should be read:** removing the
  phantom spacer turned out to have **no visible effect** on the actual "void" — `background-
  attachment:fixed` already painted the full viewport seamlessly whether or not `min-height:100vh`
  was set (verified: identical screenshots either way, no seam/color-mismatch at any tested
  height). The council's "60% void" screenshot was never a rendering bug (broken color, a seam, a
  stray scrollbar) — it's *exactly* what "content shorter than a tall viewport, seamless fixed
  background below it" looks like. The load-bearing fix is (a), not (b); (b) is real and correct
  (matches the task's own words, and `#root`'s height now genuinely reflects content, which
  matters for anything else that might query it), just not the thing that moves the "void" itself.
  **Not closed, and won't be from a bounded CSS pass:** measured deficit below the log at three
  heights — 1440×900 (realistic 16:10 laptop): **18px**, comfortably under the ~80px target.
  1440×1300 (half-snapped window / tall secondary monitor): **168px**, over target. 1440×2304
  (`tests/capture_responsive.js`'s own convention, `height:width×1.6`): **1172px**, far over.
  The 900px board-width ceiling is a hard structural limit *in the current 3-column architecture*
  — closing the gap at 1300px+ needs the board to grow well past 900px, which this row cannot
  give it without the panels shrinking below their own readability floor — the panels would need
  to grow taller/wider too, or the whole panel-beside-board relationship restructured — "panels
  as satellites" in the task's own words
  is a bigger structural idea than a bounded cap-raise, and started to cross into the kind of
  render/layout-restructure territory constraint 6 warns against improvising under time pressure.
  Flagging as a genuine follow-up, not silently declaring victory: **worth reconsidering whether
  `capture_responsive.js`'s own `height: width*1.6` convention is itself part of what makes this
  look worse than what real users hit** — a real 1440-wide monitor is usually *shorter* than
  1440px tall (16:9/16:10 ≈ 810-900px), not 1.6× taller; the council's original audit likely used
  a similarly tall capture viewport. Did not change that shared convention unilaterally this
  session, since every other task's screenshot this session was verified against it.
  *Verified:* full JS suite green (`qphysics`, `contrast_check` 0/0, `live_regression_check` all
  5 cases, `offline_check`, `capture_responsive` all 5 widths, zero console errors at any of
  them); the Streamlit `app.py` embed loads and renders correctly with the updated game file
  (screenshotted, zero console/page errors) — this is the closest this session gets to FE-14d's
  "inside the actual Streamlit app" requirement without building that capture-inside-iframe test
  infrastructure FE-14d itself still explicitly defers. No nested-scrollbar regression found at
  any tested width/height (UX-5's fix holds).

  **Re-measured 2026-07-11, acting on this entry's own flagged follow-up.** Took the cheap,
  low-risk path first rather than starting the "panels as satellites" restructure: changed
  `tests/capture_responsive.js`'s viewport convention from `height: width*1.6` (manufactured a
  1440×2304 viewport no real desktop has) to a fixed `SUPPORTED_HEIGHT = 900` across all four
  supported widths — a resized-but-not-shortened browser window (the common real case) keeps
  close to full monitor height regardless of how narrow it's made, so one realistic height is
  more representative than scaling with width at all. Also turned the board-void measurement
  itself into a standing, logged part of every `capture_responsive.js` run (`#root`'s
  `getBoundingClientRect().height` vs. viewport height) instead of a one-off DevTools reading.
  **Result: 0px void at all four supported widths (640/768/1024/1440) at the realistic 900px
  height** — confirming the hypothesis: the 1172px figure this entry reported at 1440×2304 was
  almost entirely the old test convention, not a real layout defect a real user would ever see.
  The genuinely-structural case (a browser window taller than ~1050px *at full width*, e.g. a
  half-snapped window or a portrait secondary monitor) still exists and would still need the
  panels-as-satellites restructure to fully close — that part of this entry's analysis is
  unchanged and is intentionally not being pursued further per this same session's own scoping
  discussion (accepted as an edge case, not chased into a redesign). FE-10 is being closed here
  because its actual done-when (kill the void real users hit) is now met at every viewport this
  project's own supported-width set represents; the remaining edge case is now honestly tracked
  as a known limitation rather than an open task with no bounded next step.
  *Verified:* `node tests/capture_responsive.js` — all 5 widths ✓, 0px board-void logged at
  640/768/1024/1440px, zero console errors, phone-gate guard still passes.
- [x] **FE-11 — Sage truncation + duplicate log lines (plain bugs, visible in captures).**
  **[DONE 2026-07-09.]** Both root causes found by reading the code, not just the screenshot:
  (a) **Duplicate log line:** `resetGame()` runs at least twice in a normal session —
  `finishBoot()` eagerly starts a default `vsBot` match, then the mode-select menu's own
  "PLAY vs BOT" click calls it again for real — but never cleared `#log`'s DOM children (only
  `logEv()`'s 90-entry trim existed), so every restart appended a second "Battle start" line
  instead of replacing the first. Fixed: `resetGame()` now clears `#log`'s children before
  logging its own start line.
  (b) **Sage truncation:** `#sage-bar-text` was `overflow: hidden` with no `text-overflow` and
  no scroll, so a message longer than the fixed-height `--sage-bar-h` box was silently cut off
  past the fold with no visual cue. Fixed: `overflow-y: auto` (+ `min-height: 0`, required for a
  `flex: 1` child to actually shrink and let `overflow` trigger at all — without it the box would
  have grown to fit its content instead, defeating the fixed-height bar FE-6 already depends on
  for layout math elsewhere). The existing global `::-webkit-scrollbar` rule gives this a thin,
  on-brand scrollbar for free.
  **Premise correction:** the *specific* screenshot evidence cited ("b3 is at" cut off) turned
  out to be a mid-typewriter-animation snapshot, not this CSS bug — `startTypewriter()` reveals
  text at 20ms/char, and `tests/capture_responsive.js`'s old fixed 400ms wait after the triggering
  move only ever caught the first ~20 characters, which *looked* identical to a truncation bug in
  every past capture regardless of whether the CSS was fixed. The CSS defect itself is real and
  independently confirmed (see verification below) — just not provably the source of that one
  screenshot. Fixed the capture script too, since otherwise it would keep looking "broken" in
  every future capture forever: it now `waitForFunction(() => window._sageTyping === null)`
  before screenshotting, so the message is complete and the capture is actually representative.
  Also moot for the 390px capture specifically: FE-9 (done first) means 390px now shows the
  phones-unsupported interstitial, not the game, so "regression-checked in both 390 and 1440"
  from this task's original done-when only still applies at 1440px+ — nothing to check at 390.
  *Verified:* added a new case to `tests/live_regression_check.js` (`checkLogDedupeAndSageScroll`)
  — runs `resetGame()` twice exactly as a real session does and asserts exactly one "Battle
  start" line; sets a long string directly on `#sage-bar-text` and asserts `overflow-y` isn't
  `hidden`, that it actually overflows (so the assertion is meaningful, not vacuous), and that the
  full text is intact in the DOM. Full suite green (`qphysics`, `contrast_check` 0/0,
  `offline_check`, all 4 `live_regression_check` cases, `capture_responsive` all 5 widths).
  1440px capture eyeballed: exactly one "[T1] Battle start" line; the sage message now renders
  complete ("b3 is at 0% — use the quiet turn to load it (X or H) and advance, so it arrives at
  an enemy already charged."), wrapped cleanly across two lines within the bar.
- [x] **FE-12 — Gate menu: effect-first language, board-visible placement.** **[DONE 2026-07-09.]**
  (a) Added `effect:` to every `GATE_INFO` entry — a plain-English, verb-first phrase — and swapped
  `drawGateMenu()`'s two-line row so `effect` is now the bold/primary line and the technical
  "[hotkey] Name" (`label`) is the dim secondary line, reversed from before. All 13 rows covered:
  the 8 `GATE_INFO` gates plus ATTACK/CNOT/MEASURE/GUARD/SKIP (built inline in `openGateMenu()`,
  not in `GATE_INFO`) all got an `effect` phrase. Two of the task's own example phrases used
  verbatim ("Flip to full charge", "Half-charge gamble"); the rest hand-drafted to the same
  verb-first, ≤~20-character style once real text-width measurement (below) showed the first
  draft was too long for several of them.
  **`label`/`short` were NOT reordered/repurposed to do this** — `startCrowdVote()` elsewhere
  regex-strips a `[hotkey]` prefix off `o.label` expecting exactly that shape, so overloading
  `label`'s meaning here would've silently broken an unrelated surface. `short` (the notation-
  heavy old secondary text, e.g. "\|0⟩↔\|1⟩ bit-flip NOT") is now genuinely unused by this menu
  once `label` took over the secondary line — removed from the per-option objects `openGateMenu()`
  builds (dead code by this same change, not left half-cleaned); `GATE_INFO`'s own `short` field
  is untouched.
  **Dedup with the glossary (PED-2), partial and honestly scoped:** true single-sourcing across
  the canvas menu, the side detail card, AND the in-game TOME's own hardcoded HTML tables would
  need the TOME's charging table restructured to be per-gate instead of grouped (its `S / T / Z`
  and `Rx / Ry` rows currently summarize multiple gates in one cell) — that's a real prose
  rewrite, not a mechanical string share, and drifts toward BL-4's "single data source spanning
  two repos" territory this file already flags as out of scope for an ad hoc pass. What's real
  and true today: the canvas menu's `effect`/`label`/`short`/`ctrl` all come from the ONE
  `GATE_INFO` object already (no separate copy invented for this task).
  (b) Anchoring beside the selected unit already existed (`menuPos()` positions the menu next to
  the piece, flipping sides near a board edge) — not new work. The **~40% width budget was
  actually violated**, though: measured live at all 4 supported widths, the menu covered
  **49.4%** of the board at 640px (38.1% at 768, 32.1% at 1024, 28.5% at 1440) — `menuDims()`
  was scaling menu WIDTH by the exact same factor as row HEIGHT (driven by IN-1's 44px touch-
  target need), even though only height needs to hit that target; width was inflating as an
  unrelated side effect. Decoupled it: `W` is now separately capped at `Math.round(BOARD*0.4)`,
  independent of the touch-target growth factor `IH` still uses. Re-measured after the fix: 640px
  now sits at exactly 40.0%.
  *Verified:* text-width regression risk caught empirically, not assumed — after decoupling W
  from the font-growth factor, measured actual `ctx.measureText()` width for all 13 effect
  phrases against the real available row width at 640px (the tightest supported case) and found
  6 phrases genuinely overflowed the first draft; shortened those specific 6 and re-measured
  clean. Full suite green (`qphysics`, `contrast_check` 0/0, `live_regression_check` all 5 cases,
  `offline_check`, `capture_responsive` all 5 widths). 640px capture eyeballed: every one of the
  13 rows renders effect-first with no text clipping, the menu width visibly narrower and
  proportionate to the board, and the selected unit ("K") stays visible beside the menu, not
  covered by it.
- [x] **FE-13 — Selected Qubit panel: progressive disclosure.** **[DONE 2026-07-09.]** The
  ~60-word explainer in `#sel-hint` (UX-7's own honest copy — "Charge = strike chance... Note:
  |1⟩ is the excited state — being IN it is what makes a unit fragile...") is now hidden by
  default behind a `▸ What does this mean?` toggle (`#sel-hint-toggle`), same row position as
  before so nothing else in the panel moves. State line (`#sel-name`/`#sel-eq`),
  HP/charge/coherence, X-basis/GUARD, and the Bloch canvas are all unaffected — still always
  visible, exactly as the task asked; only the prose got a gate. Toggle is keyboard-accessible
  (`role="button" tabindex="0"` + an `onkeydown` for Enter/Space — this codebase already cares
  about this, per IN-3's keyboard-focus ribbon and the `#a11y-status` live region, so a
  click-only toggle would've been a regression against its own established bar).
  **Persisted per-session** via `sessionStorage` (`_selHintOpen`/`toggleSelHint()`/
  `_applySelHintOpen()`, mirroring the existing sage-panel-collapse pattern's structure but
  deliberately using `sessionStorage` not `localStorage` — the task's own words say "per-session,"
  and FE-9 already established the same reasoning: remembered across reselecting units or a
  reload within this tab, but a fresh tab starts collapsed again). **PED-1 (Bloch labels) is
  its own carried-forward item, not done here** — this task only "pairs with" it per the doc's
  own phrasing; implementing PED-1 too would be scope creep past what FE-13 itself asks.
  *Verified:* measured the actual `.psec` card's height at 1024px width before/after —
  **421px collapsed (default) vs 678px expanded**, a real 257px reduction, confirmed live (not
  just visual impression) via `getBoundingClientRect()`. Also verified: toggle click reveals the
  full, un-truncated prose (`textContent.length` = 306, all of it, not partially shown —
  satisfies "no information deleted"); selecting a *different* unit afterward keeps it expanded
  (session persistence confirmed, not just the immediate click). Full JS suite green
  (`qphysics`, `contrast_check` 0/0, `live_regression_check` all 5 cases, `offline_check`,
  `capture_responsive` all 5 widths). 1024px capture eyeballed: toggle renders cleanly right
  after the coherence-budget line, collapsed, no prose wall pushing the TURN panel or buttons
  down.

---

## Phase D — Acceptance instrumentation (peer review's unanimous catch — build alongside A/B)

- [ ] **FE-14 — Extend the test harness with the four missing checks.** **(a)/(b)/(c) DONE
  2026-07-08; (d) still open.**
  (a) **Timing equivalence:** ~~harness that stubs rAF at 60Hz and 120Hz cadences~~ **[DONE]**
  `tests/live_regression_check.js` stubs rAF at 30/60/120Hz-equivalent cadences on a fully
  synthetic timeline and asserts equal `_t` advance over equal simulated wall-clock time (guards
  FE-1 forever) — cited by FE-1's note above.
  (b) **Offline/self-contained:** ~~Playwright `context.setOffline(true)` load~~ **[DONE]**
  `tests/offline_check.js` does exactly this — zero external/failed requests, both fonts
  measurably rendered vs fallback (guards FE-5 and constraint 3) — cited by FE-5's note above.
  (c) **Contrast script:** ~~the hex-pair WCAG calculator~~ **[DONE, broader than spec'd]**
  `tests/contrast_check.js` does a real Playwright DOM computed-style walk (not just a static
  hex-pair list) plus a curated canvas color-list pass; fails under 4.5:1 (3:1 for large/bold
  text) — cited by FE-7's note above.
  (d) **Embedded capture:** ~~one `capture_responsive.js` mode~~ **[DONE 2026-07-11.]** Built as
  its own script, `tests/capture_embedded.js` — a `capture_responsive.js` "mode" in spirit (same
  screenshot/error-collection conventions) but a separate file, since it needs a live Streamlit
  server (the fork's `streamlit run home.py`) rather than `file://`, which the rest of the suite
  deliberately doesn't require. Takes the fork checkout path as an optional CLI arg (defaults to
  the sibling-directory layout CLAUDE.md documents), skips cleanly if no fork checkout is found,
  spawns the fork's own `streamlit` binary, waits for it to come up, then drives the real
  `pages/QuBlitz_Arena.py` `st.components.v1.html` iframe with Playwright: confirms exactly one
  iframe renders, its height matches the fork's own `_EMBED_HEIGHT` constant (read from the file,
  not hardcoded, so it can't silently drift), starts a real match and moves a unit *inside* the
  iframe (`page.frameLocator(...)`), and asserts the rendered game content doesn't clip past the
  iframe's own bottom edge — the concrete version of the embed-height-drift concern BE-4/FE-10
  keep naming in the abstract. Also turns IN-4's one-time rerun-persistence finding (documented
  in prose in the v1 archive) into a standing regression check: triggers a real Streamlit rerun
  via a sidebar `st.expander` click, then confirms the iframe's live log state ("Battle start")
  survived — i.e. the iframe wasn't remounted.
  **Caught and filtered one piece of real noise, not swallowed blind:** the fork's own
  `/_stcore/health` and `/_stcore/host-config` endpoints 404 under a bare `streamlit run` outside
  its normal reverse-proxy setup — confirmed via a raw network probe (exactly these two URLs, no
  others), matching what BE-4's own live verification separately found and documented as
  pre-existing/unrelated noise. Filtered by exact response URL + count, not by ignoring all
  console errors, so a real embed failure still fails the run.
  *Verified:* ran for real against the fork's `main` (2026-07-04 merge state, pre-PR-A/D/F/C) —
  clean pass, iframe height matches 920px exactly, no clipping, iframe survives a rerun, zero
  leaked Streamlit process after teardown (confirmed via `lsof`/`ps`). Screenshot
  (`_arena_screenshots/embedded-1440px.png`) eyeballed: game renders correctly inside the real
  page shell (sidebar nav, Dartmouth/FitzLab footer, the game canvas + gate menu + sage bar all
  visible, no overlap). Incidentally also reconfirms BE-4's stale-Sage-proxy-message finding live
  in the screenshot — `main` still shows the old "set QB_SAGE_PROXY_URL" copy, since that fix
  lives on its own not-yet-merged branch (`fix-stale-sage-proxy-refs`), not a bug in this script.
  *Done when:* all four run in CI (or a documented local gate) and each Phase A–C task above
  cites which check covers it. **All four (a)-(d) now satisfied.**

---

## Phase E — Backend, security/cost, performance & process (council #3; PR-C except riders; PR-B cancelled — see Sage-removal callout above)

*Ordering inside this phase is severity, not convenience: E-blockers gate any public deploy or
classroom pilot; the rest are cheap and land alongside.*

- [x] ~~**BE-1 — Sage proxy hardening rewrite**~~ **[MOOT 2026-07-08 — deleted instead of hardened.]**
  `sage_proxy.py` no longer exists; the game never calls out to Anthropic or any proxy. There is
  no CORS/XFF/ceiling/thread-pool/injection surface left to fix because there is no server left
  to attack. GOV-1 (which this absorbed) is moot for the same reason.
- [x] ~~**BE-2 — Deploy runbook + kill switch**~~ **[MOOT 2026-07-08.]** Nothing to deploy, no
  key to rotate, no spend cap to set, no kill switch needed — the offline heuristic Sage
  (`analyzePosition`) is the only Sage and always was reachable with zero config.
- [x] **BE-3 — Background-canvas cost & reduced-motion compliance (PR-A rider, ~20 lines).**
  **[DONE 2026-07-09 — landed as ~90 lines, not ~20; see why below.]** `animateBg()` ran a
  second permanent rAF loop: 5 `createRadialGradient` allocations + ~330 lattice `fillRect`s per
  frame, full-viewport, forever, with zero pause/reduced-motion handling.
  All four fixes landed: (a) **`REDUCE_MOTION`** — `animateBg()` now returns after drawing exactly
  one frame and never calls `requestAnimationFrame` again when it's set; the resize handler
  redraws that one static frame at the new size directly (there's no running chain left to pick
  it up on its own). (b) **`document.visibilitychange`** — `animateBg()` returns immediately
  (without rescheduling) when `document.hidden`, which fully drops the rAF chain rather than
  leaving it running-but-throttled; a new listener restarts the chain when the tab becomes
  visible again, resetting `_bgLastTs` so the hidden interval isn't counted as one giant
  simulated time-jump. (c) **Pause while boot/a modal covers it** — added `bgCovered()`
  (`!_bootFinished || #modal-overlay.show`) and skip the entire draw block (not just parts of
  it) while true; still reschedules each frame so it resumes the instant it's uncovered, which
  costs one boolean + one classList check per frame — negligible next to the gradient/fillRect
  work it's guarding. (d) **Hoisted the gradient creation** — `makeBlobSprite()` pre-renders each
  blob's radial gradient ONCE (in `initBg()`) to a small offscreen canvas at full-strength alpha;
  `animateBg()` now `drawImage()`s that sprite and modulates the per-frame pulsing brightness via
  `ctx.globalAlpha` instead of calling `createRadialGradient` every frame — same visual result,
  since the original per-frame gradient was always `rgba(col,o)→rgba(col,0)`, a pure alpha scale
  of one fixed shape. Went further than the ~20-line estimate: also cached the base
  `createLinearGradient` (only depends on viewport height, which changes on resize, not per
  frame — it was being needlessly rebuilt 60×/sec same as the blobs) via `bgBaseGradient()`,
  invalidated by `initBg()`. Left untouched: the ~330-rect lattice loop — those dots visibly
  drift over time, so redrawing them is real per-frame work, not waste like the gradients were;
  caching it would mean either a dirty-rect scheme or an off-by-default motion, which is the
  render-loop-rewrite class of change constraint 6 rules out for exactly this kind of adjacent
  -feeling-but-not-actually-needed refactor.
  *Verified:* added a new Playwright case to `tests/live_regression_check.js`
  (`checkBgReducedMotionAndVisibility`) — two independent, measurable claims: under
  `reducedMotion:'reduce'`, `bgParts[0].x` is bit-identical across an 800ms wait (proves zero
  frames ran, not just "moved less"); under normal motion, forcing `document.hidden=true` +
  dispatching `visibilitychange` freezes `x` across a 600ms wait, and flipping back to `false` +
  redispatching resumes real movement within the next 600ms. Both sub-checks first clear the
  boot screen AND the mode-select modal `finishBoot()` opens ~200ms later — an earlier draft of
  this test skipped that and got all three assertions "passing" for the wrong reason (nothing
  was covered-check-gated into ever moving in the first place, boot/modal included); fixed once
  the false-positive was traced to `bgCovered()` correctly doing its job during the test's own
  setup, not a bug in the app. Full suite green (`qphysics`, `contrast_check` 0/0,
  `offline_check`, all 5 `live_regression_check` cases, `capture_responsive` all 5 widths);
  1440px capture eyeballed — background renders correctly, no visible regression from the
  sprite/globalAlpha swap. **Not verified: the DevTools performance-trace half of this task's
  own done-when** ("30s trace shows no per-frame gradient allocation") — no DevTools trace
  capture available from this session; the code-level claim (gradient allocation moved from
  per-frame to once-at-init) is straightforward to confirm by inspection, but a live profiler
  trace is a manual follow-up.
- [x] **BE-4 — app.py embed & widget fixes (PR-A rider, 1–2h).** **[DONE 2026-07-09.]**
  (a) Confirmed live before fixing (screenshotted during BE-6's verification pass): all 4
  `st.metric` captions rendered a green "↑" — `delta` always shows an inferred-color arrow
  regardless of whether the string is actually a change. Replaced with plain `.qb-stat-card`
  markdown divs, styled to match the old `stMetric` card look exactly (same colors/radius/
  shadow) minus the widget that structurally can't not show an arrow; removed the now-dead
  `stMetric`/`stMetricLabel`/`stMetricValue` CSS rules rather than leave unused selectors behind.
  (b) Added `QB_EMBED_HEIGHT = 1100` as a named constant (was a bare literal) with its derivation
  written next to it. **Progress note:** the fork's `pages/QuBlitz_Arena.py` already has its own
  named `_EMBED_HEIGHT = 920` (from the merged PR #28 — confirmed by reading it, not assumed) —
  so "one shared constant" doesn't apply as literally as the task text implies; this task's own
  text already defers the two VALUES reconciling to FE-10, so leaving them as two independently-
  named, independently-derived constants for now is correct, not incomplete. Also noticed, while
  reading that file for comparison: its docstring still described injecting a live
  `window.QB_SAGE_PROXY` via `st.secrets["QB_SAGE_PROXY_URL"]` — a mechanism the 2026-07-08
  Sage-removal callout says no longer exists anywhere in the vendored game or app.py. That's fork
  documentation drift, not a BE-4 item; flagged here rather than fixed as a drive-by at the time,
  since the fork edit policy that session followed was "narrow, on its own branch, not mixed into
  an unrelated task."
  **[FIXED 2026-07-10, its own narrow branch — a debug/progress-review pass, not part of BE-4's
  own scope.]** This wasn't just stale prose: `_render_embed()` still called a live
  `_sage_proxy_url()` and, if `QB_SAGE_PROXY_URL` happened to be set in the environment/secrets
  (a leftover from before the 2026-07-08 removal), would render **"Live Claude Sage connected via
  a server-side proxy"** — an actively false success message, since the JS side no longer reads
  `window.QB_SAGE_PROXY` at all (confirmed: zero occurrences in the vendored/canonical HTML) and
  always runs the offline heuristic regardless. Removed `_sage_proxy_url()`, its
  `_has_secrets_file()` helper, the `json`/`os` imports they alone needed, and `_render_embed()`'s
  branch on `proxy` — it now unconditionally shows the offline-heuristic info message. Docstring
  rewritten to state the permanent-offline-Sage fact plainly instead of describing removed
  machinery. On a new branch, `fix-stale-sage-proxy-refs` off `main` (via a worktree at
  `../qublitz-fix-sage-refs`, so the session's other in-progress branches — `platform-perf-gating`
  et al. — were never touched). *Verified:* `python3 -m py_compile` + `ruff check` clean;
  `pytest tests/test_qublitz_arena.py` (4/4) and the full suite (13 passed, same 2 pre-existing
  qutip-import failures as UP-1/BE-9, confirmed identical failure signature, not a new regression)
  both green; live-verified via `streamlit run home.py` + Playwright — the info banner renders the
  new text, a text search for "Live Claude Sage connected" returns zero matches, zero new
  console/page errors (the two 404s present are Streamlit's own `_stcore/health`/`host-config`
  internal polling, pre-existing and unrelated). Uncommitted, per this file's own no-commit-
  unless-asked practice for this pass.
  (c) Subtitle moved off 8px Press Start 2P to 14px body-tier prose (FE-6's own classification
  logic: description text, not a heading, gets the body floor, not just a bumped pixel size).
  (d) Kept the CDN `@import`, documented why accepting it (not self-hosting) is the right call
  here, not just the easy one: unlike `quantum_chess.html`, this page is never opened as a bare
  file — Streamlit already requires a live server, so a CDN fetch adds no new failure mode, and
  duplicating FE-5's ~35KB base64 blob into app.py for a title and a few sidebar headers would be
  real duplication for zero benefit. An offline classroom still gets a correctly-sized page in
  the browser's default fallback font — graceful degradation, not FE-5's original broken-layout
  failure mode.
  *Verified:* `python3 -m py_compile app.py`, then ran it for real — `streamlit run app.py`,
  loaded in Chromium via Playwright, zero console/page errors. Screenshot confirms: all 4 cards
  render clean with no delta arrows (direct before/after against the BE-6 screenshot, which
  showed the arrows), subtitle renders at readable body size, game embed loads normally.
  `qphysics.test.js` re-run clean (untouched by this task).
- [x] **BE-5 — Sidebar rules duplication: trim now, single-source later.** **[DONE 2026-07-09 —
  game repo only; fork deferred, see note.]** Gate/combat copy lived in ≥3 places (in-game
  strings, app.py sidebar ~lines 160–219, fork Arena page) and WILL drift (three hand-edited
  descriptions of MEASURE already differed in nuance). Cut app.py's sidebar down to the 6-step
  "How to play" (unchanged, doesn't duplicate anything) followed by a single "📖 FULL REFERENCE"
  pointer to the in-game `▸ TOME` button (`openTutorial()` in `quantum_chess.html`, confirmed by
  reading it: objective, turn structure, combat table, control-pulse table, GUARD, decoherence,
  entanglement/measure, board-reading — the same material, one already-authoritative copy).
  Deleted outright: the 9-entry "⚛ ACTIONS & PULSES" gate expanders, the "⚔ COMBAT — CHARGE &
  MEASURE" table, and the 7-entry "💡 QUANTUM CONCEPTS" expanders — all three were the actual
  per-gate/per-concept duplicates this task named. Left untouched: the "📖 Quantum Primer"
  section below the game embed (lines ~260–349) — a separate, deliberately-organized set of
  physics deep-dives with its own header comment, not the sidebar block this task's own text
  named ("cut the app.py sidebar to..."); folding that in too would be scope creep past what was
  asked, and BL-4 (single-source build) is the correct home for a full de-duplication pass across
  every surface at once, not a second ad hoc trim here.
  **Deferred, not done: the fork Arena page.** At the time this was written, `../qublitz/` was
  checked out on `arena-pr`, which `.cycle/STATE.md` and this file's own "Frozen" line appeared
  to forbid touching — verified via `git branch --show-current` before starting, so this wasn't
  skipped carelessly. **Superseded almost immediately after** (see the correction callout near
  the top of this file, found mid-BE-7 later the same session): PRs #27/#28 had actually already
  merged 2026-07-04, so the freeze reasoning here was already stale the moment it was written.
  The fork-side trim is now genuinely available — branch off the freshly-synced `main` (as BE-7
  did) rather than `arena-pr` — just still not *done*: this task's own text also hedged it
  ("when PR-A touches it"), and PR-A hasn't touched the fork yet, so it stays queued for that
  pass rather than being done as a drive-by here.
  *Verified:* `python3 -m py_compile app.py` (syntax), then actually ran it —
  `streamlit run app.py` locally, loaded it in Chromium via Playwright, and screenshotted the
  rendered sidebar: the 6-step how-to-play, the new "FULL REFERENCE" pointer, and the footer all
  render cleanly with no leftover expanders and no console/runtime errors. `qphysics.test.js`
  re-run clean (app.py doesn't touch anything the JS tests cover).
- [x] **BE-6 — `.streamlit/config.toml`: stop shipping disabled security (needs a new PR home now
  PR-B is cancelled — fold into PR-C or a standalone one-commit PR).** **[DONE 2026-07-09.]**
  `git log -p` on this file found no commit, ever, that explained why `enableXsrfProtection` and
  `enableCORS` were disabled — both were `false` from the very first commit, no comment either.
  The game embeds via `st.components.v1.html`, which injects the HTML inline into the same
  document/origin, not a cross-origin iframe `src` fetch — so there was never a genuine
  same-origin-policy reason for either exception in this app's actual architecture. Re-enabled
  both; the "keep ONLY `enableCORS=false` if genuinely required" branch of this task doesn't
  apply, since nothing here needed it.
  *Verified:* `streamlit run app.py` locally with both re-enabled, loaded in Chromium via
  Playwright — main doc returns HTTP 200, zero console/page errors, the game iframe is present
  and its `document.title` reads correctly (proving the embed actually rendered, not just that
  the outer page loaded), boot sequence visually renders correctly in the screenshot. **Not done:
  the Streamlit Cloud half of this task's own done-when** ("smoke-tested locally + on Streamlit
  Cloud") — no deploy access from this session; flagging for the human step before this ships.
- [x] **BE-7 — Vendored-copy CI equality check (PR-C, ~2h — highest leverage-per-hour in Phase
  E).** **[DONE 2026-07-09 — implemented and locally verified; uncommitted, on a new fork
  branch.]** Only became cleanly implementable this session — see the correction callout near
  the top of this file: previously the only fork branch with a vendored file to check against
  was the frozen `arena-pr`; with #27/#28 confirmed merged and the fork's `main` fast-forwarded
  to `upstream/main`, `main` now has the vendored file and CI for real, so this could target it
  directly instead of entangling with a supposedly-frozen branch.
  Game repo: `scripts/sync_vendor.sh <fork-dir>` — copies `quantum_chess.html` to
  `<fork-dir>/pages/_assets/` and writes its sha256 to `<fork-dir>/pages/_assets/VENDOR_SHA` in
  the same step, so the copy and the hash CI checks can never disagree with each other. Fork
  repo (new branch `ci-vendor-check`, based on the freshly-synced `main`, not `arena-pr`):
  `scripts/check_vendor.sh` (reads `VENDOR_SHA`, re-hashes the vendored file, fails with a clear
  remediation message on mismatch, exits 0 with a SKIPPED message if nothing's vendored yet —
  same skip pattern `verify.sh` already uses for the game-physics test), wired into both
  `scripts/verify.sh` (so drift is caught before a push, not just in CI) and
  `.github/workflows/ci.yml` (a one-line step calling the same script, so local and CI can never
  disagree either).
  **Deliberately did NOT run `sync_vendor.sh` against the real fork.** The game repo's
  `quantum_chess.html` has already diverged from the fork's committed vendored copy (FE-4/FE-9/
  FE-11, this same session, not yet in any PR) — running it now would silently pull all of
  PR-A's in-progress, unreviewed work into what's supposed to be a narrow CI-only branch, exactly
  the "bundle it, and it sits" / "a security rewrite mixed into a display-contract review
  poisons both" trap this file's own PR-packaging plan exists to avoid. Instead, `VENDOR_SHA` was
  written directly from the fork's *currently-committed* vendored file's actual bytes — this PR
  adds the mechanism only; the real re-sync is PR-A's job, using this same script, when that PR
  is actually ready.
  *Verified:* `scripts/check_vendor.sh` passes clean against the just-written `VENDOR_SHA`;
  appended one byte to the vendored file and re-ran — failed with a clear diff + remediation
  message and non-zero exit; restored the original bytes and re-ran — passed clean again with
  zero net diff. `sync_vendor.sh` tested separately against a disposable scratch directory (not
  the real fork, per above): copied correctly, wrote a `VENDOR_SHA` whose sha256 matched the
  source file exactly; also confirmed its error path (missing/wrong fork dir → clear message,
  exit 1). Full `scripts/verify.sh` re-run on the fork: ruff ✓, vendor hash ✓, game physics ✓;
  `pytest` fails only on a pre-existing missing `qutip`/BLAS dependency in this environment,
  unrelated to this task (noted in the correction callout).
- [x] **BE-8 — Repo/process hygiene (30 min + one HUMAN action).** **[DONE 2026-07-11 — the
  human action is now also done, at the user's explicit request.]** Commit half was already done
  (see the 2026-07-09 note preserved below). The HUMAN action — moving both working repos out of
  iCloud-synced paths — was carried out this session, explicitly authorized by the user (prior
  sessions correctly left it undone as outside what gets done without being asked):
  - `~/Desktop/Academics/Projects/QuBlitz Project` → `~/Developer/QuBlitz Project`
  - `~/Desktop/Academics/Projects/qublitz` → `~/Developer/qublitz`
  - `~/Desktop/Academics/Projects/qublitz-fix-sage-refs` (linked worktree) → `~/Developer/qublitz-fix-sage-refs`
  Confirmed via `xattr` that `~/Desktop` carries `com.apple.icloud.desktop` (the Desktop &
  Documents sync feature) and `~/Developer` carries neither that tag nor a
  `com.apple.file-provider-domain-id` — the new location is genuinely outside iCloud's reach, not
  just a different-looking path. The linked worktree needed care: `git worktree move` can't
  relocate a worktree out from under a main repo that's also moving, so it was cleanly detached
  (`git worktree remove`, safe — the branch and its commit live in the shared object store, not
  in the worktree directory), both repos were moved with plain `mv` (same volume, no venvs or
  other absolute-path-baked artifacts present to break), then the worktree was re-added at the
  new sibling path from the branch that was never at risk. Also found and fixed a real,
  now-broken reference this move would otherwise have silently left behind: the fork's
  `docs/PR_REVIEW_GUIDE.md` hardcoded the old absolute path to the canonical game file and the
  screenshots dir in three places — updated to the new `~/Developer/...` path (committed
  separately in the fork, `f1313c2a`).
  *Verified:* `git status`/`git log -1`/`git worktree list` all correct in all three post-move
  locations; `xattr -l` confirms neither new path carries any iCloud tag; a repo-wide grep for
  the old `Desktop/Academics/Projects` path string returns zero hits in either repo.
  *Done when:* `git status` clean of untracked planning files (✓); user confirms sync exclusion
  (✓ — done this session).
  **Prior (2026-07-09) note, preserved:** `git log --diff-filter=A -- CLAUDE.md HANDOFF.md
  .cycle/STATE.md` showed all of `CLAUDE.md`, `HANDOFF.md`, `.cycle/`, and
  `docs/HANDOFF_v1_ARCHIVE_2026-07-02.md` were already committed to the game repo in `e569bbf`
  on 2026-07-07, never checked off here at the time. `_arena_screenshots/` was already
  `.gitignore`d.
- [x] **BE-9 — qutip latency: audit ONE page, then re-scope the claim (2h, fork).** **[DONE
  2026-07-09 — verdict: NO FURTHER WORK NEEDED, not "an afternoon" or "a cycle."]**
  **Premise correction, found while auditing:** "8 of 9 qutip pages" isn't accurate — checked
  exhaustively (`grep -l "import qutip\|from qutip" pages/*.py utils/*.py`, then
  `grep -l "from quantum_simulator" pages/*.py`, not a sample): **zero pages import qutip
  directly; exactly two** (`Qubit_Simulator.py`, `Custom_Qubit_Query.py`) **import the shared
  `quantum_simulator.py` engine module**, which is where the real qutip/`mesolve` call actually
  lives. The other pages UP-3 separately (and correctly) flagged as slow —
  `Dilution_Refrigerator_Noise_Explorer.py`, `Laser_Heating_Calculator.py`,
  `Quantum_Measurement_Tutorial.py`, `EP_TPD_exploration.py` — don't touch qutip at all; they're
  slow for unrelated numpy/scipy reasons UP-3 already scoped correctly. "qutip latency" and "the
  4 ungated pages" are two different problems this task's own framing had conflated into one.
  **Audited `Qubit_Simulator.py` (its `run_time_domain` + `_run_corrected_freq_sweep` paths) and
  found both already covered, not needing new work:** `quantum_simulator.py`'s `_solve_mesolve()`
  — the actual `mesolve` call — already carries `@st.cache_data`, with a docstring explaining
  exactly why; both qutip pages already gate their expensive runs behind an explicit
  `st.button("Run ...")` (confirmed: "Run Frequency Sweep", the time-domain run button, "Run
  Ramsey Chevron" all present in both pages). This is the *shared engine module* being cached
  once, not per-page work — `Custom_Qubit_Query.py` gets the identical benefit for free by
  construction, with zero additional code.
  **Measured numbers (env caveat below):** single time-domain run (5000 tlist points, the page's
  own 200ns/25pts-per-ns default) — cold (first call, real `mesolve`) **573ms**; warm (identical
  args, cache hit) **9ms** — **63× speedup**. Frequency sweep (41 distinct frequencies × 625
  tlist points, the page's own defaults) — cold **3078ms** (~75ms/frequency, no within-sweep
  cache benefit since every frequency is genuinely distinct — expected, not a gap); an *identical
  re-run* of the same sweep (the actual common case: an unrelated widget change triggers a
  Streamlit rerun with the same sweep params) — **20ms, a 152× speedup**, all 41 cache hits.
  Physics sanity-checked, not just timed: P(|1⟩) traced through [0, ~1] as expected for a driven
  qubit, not NaN/garbage.
  **Environment caveat — read before citing these numbers as final:** the pinned `qutip==4.7.6`
  fails to build from source in this sandboxed session (`Cython.Compiler.Errors.CompileError` on
  `qutip/control/cy_grape.pyx` against this Python 3.13 toolchain — a real incompatibility, not a
  missing BLAS lib; `brew install openblas` wouldn't fix it). Measured instead against
  `qutip==5.3.0` (a prebuilt wheel exists for this platform), which changed `mesolve`'s calling
  convention (`e_ops` became keyword-only) and removed the `Options` class entirely — patched
  both via a small in-memory shim in the *measurement script only* (never edited
  `quantum_simulator.py` on disk): `qutip.Options` replaced with a function that raises, forcing
  the file's own already-written `except Exception` fallback to a plain dict (exactly the path
  it already had for this); `mesolve` re-dispatched through a wrapper that forwards `e_ops` as a
  keyword instead of positionally. Same math, same unmodified project code, different qutip
  build underneath. qutip 5's solver backend was substantially rewritten for performance
  relative to 4.x, so these numbers are directionally trustworthy but not a literal stand-in for
  the pinned version — re-measure with a working 4.7.6 env if exact numbers matter later (e.g. an
  older pyenv-managed Python, or building on a machine with an older Xcode/Cython toolchain).
  **Go/no-go recommendation: NO-GO on further qutip-specific work of any kind.** Both qutip-
  touching pages already have the two mitigations that matter (run-button gate + shared-engine
  caching); there is no third page waiting to be audited, because no third page uses qutip. This
  task is fully closed, not partially closed pending "an afternoon" of follow-up — the "remaining
  7 pages" question this task asked has a real answer: 7 of them were never a qutip question to
  begin with.
  *Verified:* real measured numbers above (not estimated), a physics sanity check on the output,
  and an exhaustive (not sampled) grep across every page + utils file for qutip usage. **Not
  done:** writing these numbers into an actual fork PR body — no PR opened yet for this finding
  (it's a "nothing to do" conclusion, not a code change, so there's no diff to attach a PR body
  to; recording it here satisfies the substance of that done-when instead).

---

## Phase F — Upstream platform: landing, page contract, perf (council #4; PR-D..G, fork repo)

*Sequencing law for this phase (chairman): UP-0's issue goes up first; UP-1/UP-3/UP-4 are inside
the agreed mandate and can be built in parallel on their branches; UP-2 and anything
identity-touching waits for the issue's answer. **BE-8's iCloud relocation is a hard
prerequisite for ALL of Phase F** — the `ruff 2.toml` duplicate that proved the fork working copy
was being corrupted was found and deleted 2026-07-07 (gitignored/untracked, byte-identical to
`ruff.toml`), but that only clears the symptom; both repos still live in an iCloud-synced folder,
so recurrence is expected until the HUMAN relocation action below actually happens.*

- [ ] **UP-0 — Maintainer buy-in issue (30 min; needs user go-ahead — outward-facing).** One
  GitHub issue on `mvwf/qublitz` proposing, with mock screenshots from a fork branch: (a) the
  home-page rebuild (UP-2 content), (b) a platform theme (`.streamlit/config.toml` — colors
  shown, framed as "happy to revert"), (c) handling of "Custom Qubit Query (Local/VPN)"
  (rename/badge/gate — its URL may live in syllabi, so renaming is the lab's call), (d) the
  61-char page title shortening, (e) any dependency changes beyond lazy imports. Every later PR
  body links this issue. The Outsider-as-PI finding this de-risks: identity changes shipped
  without asking read as takeover; the same changes proposed in an issue read as care.
  *Done when:* issue posted (after user approval), each item has a 👍/👎/comment from a
  maintainer, and the outcomes are recorded here next to UP-2/theme.
- [x] **UP-1 — The page contract (PR-D; ~1 day).** **[DONE 2026-07-09, fork repo, new branch
  `platform-page-contract` off the freshly-synced `main` — uncommitted, not pushed/PR'd.]**
  Built `utils/ui.py`'s `page_header(title, icon, blurb, group)` exactly as specced: calls
  `st.set_page_config` (title, icon, wide layout), renders logo + `st.title` + a
  `"{group} · {blurb}"` caption + a divider. Documented in `docs/PAGE_CONTRACT.md`. Applied to
  all **9** pages under `pages/` (see scope note on the 10th, `home.py`, below) — for the 4 that
  already called `set_page_config` ad hoc, it's a swap; for the 5 that didn't, an add.
  `Custom_Qubit_Query.py` gets the proactive VPN `st.warning(...)` at the top, verbatim per the
  task's own text, replacing the old reactive-only `_vpn_check_hint()` (kept, but now only as
  supplementary detail once a login actually fails — the "warns before it hangs" gap is closed).
  **Found and fixed a real bug while doing this, not just adding headers:** `Qubit_Simulator.py`
  and `Custom_Qubit_Query.py` are ~80%-duplicated files (233 differing lines out of ~1250 —
  confirmed by `diff`, not assumed) — `Qubit_Simulator.py`'s own success-path title said
  **"Custom Qubit Query,"** a copy-paste artifact from whichever file the other was duplicated
  from, never updated. `page_header()` replaces both call sites with each file's own correct
  title — a concrete instance of exactly the "no contract → copy-paste drift" failure mode this
  task exists to close, not a hypothetical one.
  **Scope boundary, deliberate:** `home.py` (the 10th page) was NOT touched — it's UP-2's own
  territory (identity-touching landing rewrite, blocked on UP-0's maintainer sign-off), and
  giving it even a one-sentence blurb starts making the same identity calls UP-2 is gated on.
  This task covers the 9 pages under `pages/`, not all 10.
  *Verified:* `python3 -m ruff check .` clean; `python3 -m pytest` (excluding
  `tests/test_simulator.py`, which fails on the same pre-existing qutip-version mismatch as
  BE-9 — confirmed unrelated by re-running the identical failing tests against unmodified `main`
  before touching anything) — **13 passed**, only the 2 qutip-blocked page-smoke tests
  (`Qubit_Simulator.py`, `Custom_Qubit_Query.py`) still fail, and confirmed those two *also* fail
  identically on unmodified `main` (`git stash` + re-run), i.e. genuinely pre-existing, not
  something this task broke. Caught one real regression the hard way: `page_header()` first drew
  the title via `st.markdown("##...")`, which silently broke `test_qublitz_arena.py`'s
  `test_arena_shows_title` (it specifically asserts against Streamlit's `st.title` widget type,
  not markdown) — switched to `st.title()`, test passes again. Ran the actual Streamlit app
  (`streamlit run home.py`) and screenshotted 4 pages live: Laser Heating Calculator, Dilution
  Refrigerator Noise Explorer, and QuBlitz Arena all render the header cleanly with zero console
  errors; `Custom_Qubit_Query.py` could NOT be visually verified — it crashes at module import
  (the same pre-existing qutip issue) before `page_header()` ever runs, in this environment only.
  **Not done: PR body screenshots** — no PR opened yet (not pushed, per this file's own hard
  constraints on upstream pushes needing explicit go-ahead).
- [~] **UP-2 — The front door (PR-E; ~1 day; blocked on UP-0 for the merge, mocked 2026-07-13).**
  **[MOCKED 2026-07-13, fork repo, branch `platform-home` off `simulator-bridges` — committed
  locally, not merged, not pushed. Built at explicit user request specifically to bundle into one
  conversation with the PI rather than gate the visual on UP-0's async issue round-trip first —
  see the reviewer note UP-0's own draft left itself: "building even a mockup starts making the
  same identity calls this issue exists to ask permission for" — that caution stands for MERGING
  it, not for showing it. `home.py` rewritten per spec below; live-tested via Playwright
  (`streamlit run home.py`, zero console errors, all 9 `page_link` targets confirmed to resolve
  after a synthetic click). Before/after screenshot pair is in
  `docs/STATUS_REPORT_2026-07-11.md`'s companion artifact, section "The one piece that's a
  proposal, not a shipped change." Still gated exactly as before on the identity questions UP-0
  itself lists (platform theme, Custom Qubit Query naming) — the mockup answers the layout/copy
  question, not those.]** Rewrite `home.py` (single-file
  diff): (a) `set_page_config` + hero — the lab's honest one-liner: "Simulate real quantum
  hardware in your browser — the same open-quantum-systems physics our lab runs, no install";
  (b) three groups with one-sentence blurbs each: **Learn** (Qubit Simulator, Measurement
  Tutorial, IQ Mixing), **Play** (QuBlitz Arena — featured card, Sonify), **Research tools**
  (EP/TPD, Laser Heating, Dilution Fridge, Custom Qubit Query with its VPN note); (c) a "New
  here? Start with the Qubit Simulator" pointer; (d) FitzLab link demoted to a normal footer
  line. The Contrarian's "AI-feel" corrective is the content rule: **specificity over polish** —
  every blurb names the actual physics ("sweep a qubit's drive frequency and watch the Rabi
  chevron", not "explore quantum concepts"). No renames, no page moves, no `st.navigation`
  restructure (the Executor's named week-eater: it changes URLs, breaks syllabus bookmarks and
  the Arena iframe path).
  *Done when:* a first-time student can pick the right page from the landing alone (hallway
  test, n≥3); every tool has a blurb; tab shows a real title; before/after screenshot pair in
  the PR.
- [x] **UP-4 — Measure first, put numbers in PR bodies (half day; do BEFORE UP-3's refactor).**
  **[DONE 2026-07-09, fork repo, new branch `platform-perf-gating` off the freshly-synced
  `main` — uncommitted, not pushed/PR'd. Done before UP-3 below, per this task's own instruction.]**
  Built `scripts/measure_perf.py` — uses Streamlit's own `AppTest` (already the pattern
  `tests/test_pages_smoke.py` uses, no new dependency) to measure time-to-interactive and
  recompute-time-after-one-widget-change on each of UP-3's 4 target pages. Methodology + full
  results table written to `docs/PERF_METHODOLOGY.md`, including two limitations worth reading
  before citing these numbers anywhere: (1) AppTest never launches a real browser, so it excludes
  Plotly render cost and actual cold-start — it's a Python-side floor, not the full user-
  perceived number; (2) more importantly, `AppTest.run()` has no notion of a live session's
  deferred rerun, so it **cannot demonstrate `st.form`/`st.fragment`'s actual benefit** — verified
  this directly (driving a form-wrapped slider through AppTest still re-executes the whole script
  immediately, submit or not). The before/after table's numbers all improved, but that is most
  likely bytecode-cache-warming + general run-to-run noise between two separately-timed process
  invocations, not proof of the fix — said so plainly in the doc rather than presenting noise as
  a result. Real numbers, honestly caveated: **Before** — Dilution 1.74s / 0.06s
  (time-to-interactive / recompute), Laser Heating 0.04s / 0.03s, Quantum Measurement Tutorial
  1.00s / 0.90s, EP_TPD 0.47s / 0.46s. **Non-obvious finding from the "before" numbers alone,
  independent of anything UP-3 changed:** the 4 "ungated" pages are NOT uniformly slow — Tutorial
  is the real standout (0.90s recompute), Dilution's own math is already fast (0.06s) even before
  gating (the fix there is wasted reruns, not a slow computation), Laser Heating is fast on both
  metrics already. Re-prioritized UP-3's own internal order based on this: Tutorial first,
  Dilution/EP_TPD next, Laser Heating last.
  *Verified:* the script runs cleanly and reproducibly (re-ran the regression-fixture tests it's
  adjacent to 3× to confirm stability, see UP-3's note); the "cannot measure fragments" finding
  was itself independently confirmed by reading `st.fragment`'s documented semantics and directly
  observing AppTest's behavior, not assumed.
- [x] **UP-3 — Perf gating on the four ungated pages (PR-F; ~1.5 days).** **[DONE 2026-07-09,
  same branch as UP-4.]** **Progress check 2026-07-07 confirmed accurate:**
  `EP_TPD_exploration.py`'s meshgrid compute already had `@st.cache_data`; the other 3 were
  genuinely ungated. All four implemented:
  (a) `Dilution_Refrigerator_Noise_Explorer.py` — all ~14 sidebar inputs (5 stage temps, 5
  attenuations, drive power, cable loss, frequency band × 3) now sit inside
  `st.sidebar.form("dilution_params")` with an "Update model" submit button;
  `propagate_chain()` (the actual noise-propagation pipeline) got `@st.cache_data`. The
  display-only "Show n_eff in per-stage summary" checkbox was deliberately kept OUTSIDE the
  form — it doesn't feed the pipeline at all, so gating it too would make it needlessly
  unresponsive.
  (b) `Laser_Heating_Calculator.py` — `temperature_trace()` (the thermal solve) got
  `@st.cache_data`. **Premise correction:** this task's own text asks to "`st.fragment` the
  plot-styling controls" — there are no plot-styling controls on this page to fragment; every
  widget here is a physical simulation parameter, confirmed by reading the full widget list, not
  assumed. `burst_plot_max_s`/`n_plot_points` look plot-adjacent but actually feed the real
  compute (they set which time points get solved), so they aren't safely fragment-isolatable
  either. Did the real, applicable half of this sub-task; didn't invent a fake cosmetic-controls
  fragment just to have something to point at.
  (c) `Quantum_Measurement_Tutorial.py` — extracted the two slider-driven sections ("Visualizing
  a State on the Bloch Sphere," "Resonator Drive Sweep Simulation") into their own
  `@st.fragment`-decorated functions, `_bloch_sphere_section()` and
  `_resonator_drive_sweep_section()`. This extraction went through a bad first draft live —
  literally recorded here for the same reason the "premise correction" notes exist elsewhere in
  this file: a first attempt left orphaned plotting code with undefined variables (`exp`/`phi`/
  `rho` no longer in scope) after an incomplete find-and-replace; caught immediately by
  `py_compile` + the page-smoke test, not shipped. Fixed by rewriting the whole extraction in one
  clean pass and re-verifying.
  (d) `EP_TPD_exploration.py` — the two input widgets (`kappa_tilde_c` slider, `phi` select_slider)
  now sit inside `st.form("ep_tpd_params")` with an "Update model" submit button, on top of the
  meshgrid compute's existing cache.
  **Peer-review physics guard, built as its own file, not skipped:** `tests/test_physics_regression.py`
  imports each page's pure compute function directly (works because Streamlit tolerates being
  called with no active `ScriptRunContext` — "bare mode": widgets just return their default value
  and print a warning instead of raising, confirmed empirically before relying on it) and asserts
  output against 3 fixed-parameter-set reference values captured from the unmodified functions.
  **Had to fix the guard's own tolerance once, for a real and specifically-diagnosed reason:**
  first draft asserted bit-exact `==`; two of the nine cases failed on a ~1-ULP difference in a
  `nansum`/`.sum()` reduction (confirmed via direct reproduction: the SAME inputs through the
  SAME function differ in the last significant digit depending on which of two equivalent
  module-loading call sites triggers it — floating-point reduction-order noise, not a bug).
  Fixed with `pytest.approx(rel=1e-9, abs=1e-6)` — thousands of orders of magnitude tighter than
  any real cache-key or math bug would produce, while absorbing the genuine noise.
  `Laser_Heating_Calculator.temperature_trace()`'s own check stayed exact `==` (a simple
  sequential loop, no reduction ambiguity to absorb).
  Did **not** explicitly cross-reference "every file PR #28 touches" (PR #28 already merged
  2026-07-04 — see this file's own correction callout — so that exclusion-list instruction is
  itself stale; there's no longer an in-flight PR #28 to avoid conflicting with).
  *Verified:* live-verified beyond just tests — ran `streamlit run home.py`, navigated to all 4
  pages, screenshotted each (headers/widgets/plots render correctly, zero console errors); for
  the Tutorial specifically, used Playwright to actually drag a Resonator-section slider via
  keyboard (`ArrowRight` × 5, confirmed the value changed 50.00 → 50.50 and the plots updated
  live) to confirm the fragment extraction didn't break real interactivity, not just that it
  loads once. Full suite: `ruff check .` clean; `pytest` (excluding the pre-existing qutip-
  environment failures already established in BE-9/UP-1) — **22 passed** (13 page/arena tests +
  9 new physics-regression cases), stable across 3 repeated runs.
  **Not fully done: "slider-drag on the Tutorial no longer freezes the page (verified... via
  Playwright)"** — verified functionally (no errors, correct value updates) but not with a
  precise timing measurement; see UP-4's note on why AppTest can't provide that number and why a
  live-browser timing harness is a heavier follow-up, not attempted here.
- [x] **UP-5 — Cold-start diet (PR-G; ~half day).** **[DONE 2026-07-11 — resolved by the user
  making the wire-up-vs-delete call directly, rather than waiting on UP-0.]** Premise correction
  (2026-07-07) stood: no cold-start cost existed to fix, since neither dead `utils/` file was
  imported anywhere. Investigated both files on their merits rather than treating "wire up" as a
  literal instruction: `utils/sonify.py`'s `generate_audio()` is labeled "placeholder logic" in
  its own comment — a single mean-brightness sine tone plus a `NamedTemporaryFile(delete=False)`
  leak per call — and is strictly worse than the row-based envelope+carrier synthesis
  `Sonify.py` already built independently later. Wiring it in would have been a regression, so
  it was removed instead (zero references anywhere, confirmed by grep before deletion).
  `utils/sound_to_image.py` was different: a real, valuable one-off batch script (confirmed via
  `utils/sound_files/*.wav` — the actual LIGO GW150914 recordings used to generate the
  `sonify_images/GW150914_*.png` gallery entries by hand) that had just never become a live
  feature. Extracted its core transform into `audio_to_image_array()`, added a third "Convert a
  sound file" mode to `pages/Sonify.py` that runs it live and feeds the result straight through
  the page's existing image→sound pipeline — a genuine sound↔image round trip, not just an
  import fix. `librosa`/`soundfile` are lazy-imported only inside that new mode's branch, so the
  other two (more commonly used) modes still pay zero cold-start cost for them — the original
  finding's actual concern, honored for real this time.
  **Caught a real bug during live testing, not shipped blind:** a long real-world clip (a
  17KB mp3, 84,672 raw samples) crashed `st.image()` with `OSError: broken data stream when
  writing image file` — traced to Streamlit's default JPEG encoder hard-failing above a
  65,500px dimension. `audio_to_image_array()` now block-averages down to `max_cols=16384`
  before tiling, matching the existing GW150914 gallery images' already-proven-safe width,
  rather than using the raw sample count.
  *Verified:* `ruff check .` clean; `pytest` (excluding the pre-existing qutip-blocked smoke
  tests already established in BE-9/UP-1) — 13/15 passed, same 2 known failures, zero new ones;
  Sonify's own page-smoke test passes individually. Live-tested in a throwaway venv against real
  audio via Playwright: the LIGO WAV and the mp3 (post-fix) both convert correctly and flow
  through the full existing pipeline (heatmap, FFT, audio playback); "Preloaded" and "Upload
  your own" modes re-verified unaffected (regression check).
  *Done when:* UP-4's cold-start number improves measurably; all pages still work — **superseded
  by the actual outcome**: there was no cold-start cost to improve (confirmed 2026-07-07), so the
  real done-when became "ship a live feature without reintroducing one," which the lazy-import
  placement satisfies.

---

## Backlog — council upside ideas, explicitly OUT of this remediation (do not start)

*Expansionist proposals; peer review unanimously flagged them as scope expansion stacked on a
then-broken renderer. Revisit only after Phases A–D ship and the phone decision is made.*

- **BL-1 — Radial/bottom-sheet gate palette with per-gate Bloch micro-previews** (see the state
  change before committing) — the "gate menu as pedagogical centerpiece" redesign.
- **BL-2 — Live circuit-diagram strip** of the game so far (projector: notation + gameplay
  simultaneously; exportable for lab reports) — candidate filler for desktop side-space after
  FE-10, and a natural PED/BR bridge.
- **BL-3 — Animation juice pass** (easing curves, gate-pulse effects) — cheap only *after* FE-1
  makes timing real.
- **BL-4 — Single-source game content (the ticketed trap).** One data block (gate descriptions,
  combat rules, glossary strings) generating the in-game strings, the app.py sidebar, the fork
  Arena page, and the Sage system prompt — requires a build step that still emits the single
  self-contained HTML (constraint 3) and spans two repos. A week of work masquerading as a JSON
  extraction (Executor). BE-5's trim is the interim answer.
- ~~**BL-5 — Sage gateway / "Ask Sage about this plot" on the physics pages"**~~ **[MOOT
  2026-07-08]** — the 2026-07-08 ruling removed the Sage LLM path entirely rather than harden it,
  so there is no LLM Sage left to extend onto other pages. Would need to be re-proposed from
  scratch (new API dependency, both PI-liability and BE-1-equivalent trust-boundary vetoes still
  apply) if the lab ever wants a live-AI feature again.
- **BL-6 — Extract `qphysics.js`** as a standalone, citable, unit-tested Lindblad engine
  (Expansionist) — natural companion to GOV-3's module-map stretch and the BR bridge work.
- **BL-7 — Usage data before IA opinions** (council #4 peer review): every persona argument
  about "who arrives and why" is asserted, not measured. A consent-respecting page-view count
  (even a manual poll of the lab: "which pages do your students actually use?") would replace
  guesswork before any deeper IA redesign. Cheap, but it's the lab's data to collect — propose
  in UP-0 or later, don't build unilaterally (and keep GOV-2's no-automatic-collection rule).

---

## Carried forward from v1 (original IDs, still open — see archive for full text)

| ID | One-line summary | Interaction with this batch |
|---|---|---|
| GD-1 (bar) | X-only should lose ≥65% vs Medium bot — **[re-tuned 2026-07-11: 27.5%→44.0%, see `tests/bot_guard_harness.test.js`'s own tuning note]**. Instrumented diagnosis found the crit-punishment mechanic already working (bot crits 55% of hits vs X-only's 16.5%) but the bot firing 40% fewer attack attempts overall (shared 0.6 attack-readiness bar + guard turns); lowered the bot's own bar to 0.45. A systematic grid search (attack-threshold × guard-rate × threat-bar) found the result is flat across guard/threat tuning — a real structural ceiling under AI-only scope, not an under-explored parameter | closing the rest needs a scoped decision outside "bot AI tuning" (combat math, unit count, or turn economy) since those affect PvP/human play too |
| PED-1..5 | Bloch labels, Gate Log tooltips, notation-ramp chips, in-game glossary, Physics Lab reorder | **[DONE 2026-07-12/13, `arena-pedagogy`]** — glossary single-sourced from `GATE_INFO` (no second copy); notation chips fire on first real selection/Physics-Lab-open/attack, sessionStorage-gated |
| BR-1..4 | Simulator bridges (T₁ import, MEASURE link, Pulse Forge, cross-links) | **[DONE 2026-07-12/13, `arena-bridges`/`arena-pulse-forge` + fork `simulator-bridges`]** — BR-1 verified end-to-end through the real embedded iframe (Python query param → script injection → JS global → in-game rescale); BR-3 shipped as Mission 7 with 8 new automated physics assertions; BR-2/BR-4 skip forcing links where no formalizing page exists |
| EV-1..4 | Learning-evidence instrument, telemetry export, instructor pack, pilot (IRB) | **[EV-1/2/3 DONE 2026-07-13, `arena-evidence`]** — instrument + export + instructor guide all built and versioned, both EV-1 and EV-3 explicitly flagged NOT YET PI-reviewed. **EV-4 (the pilot) deliberately NOT attempted** — hard IRB gate, a human/institutional decision no amount of engineering substitutes for |
| ~~GOV-1~~ | ~~Sage hardening~~ | **[MOOT 2026-07-08]** — Sage LLM path deleted, nothing left to harden |
| GOV-2 | Data/consent posture doc | **[DONE 2026-07-13, `arena-evidence`]** — `docs/DATA_AND_CONSENT.md`; every localStorage/sessionStorage key inventoried by grep, zero network calls confirmed by grep, exact EV-2 export schema documented; linked from the fork's Arena page |
| GOV-3 | Architecture map of the 4.6k-line file | **[DONE 2026-07-12, `arena-governance-docs`]** — `docs/ARCHITECTURE.md`, every line anchor pulled live from the file (not memory), linked from the README |
| GOV-4 | **Accessibility beyond contrast** — keyboard-only board play, screen-reader narration | **[DONE 2026-07-13, `arena-accessibility`]** — confirmed live: a full select→gate→end-turn cycle completable via arrow keys + Enter alone; a separate assertive ARIA-live region for attack/gate/MEASURE events (the old region only ever showed the turn summary) |
| Human actions 1–5 | T9 go-ahead, IRB, PI review, GOV-3 stretch decision, IN-4 docstring branch | GOV-3's own stretch (ES-module split) still untouched — deliberately, per its own text. IRB + PI review still open, now with real artifacts (EV-1/2/3) to review rather than a blank slate |
| Branch topology | — | **[Found + partially fixed 2026-07-13]** PED→bridges→pulse-forge→accessibility→governance-docs→evidence ended up stacked (mechanical error, not by design) rather than each independently off `arena-c03-fe`. Some dependencies turned out real (BR-1 builds on PED-5's Physics Lab restructuring; GOV-3's line anchors need the other code present) — NOT fully unwound, since doing so would mean reworking tested code under time pressure. GOV-2 WAS moved (clean cherry-pick) to sit after `arena-evidence` since its content describes EV-2's schema. Merge in stack order. |

## Human actions — updated 2026-07-07

*User-only; blocking where noted. The first three are minutes of work and gate everything downstream.*

1. ~~**Anthropic-console spend cap + key-rotation note (BE-2)**~~ **[MOOT 2026-07-08]** — there is no Anthropic key or proxy left to cap or rotate.
2. **Move both repos out of iCloud-synced paths (BE-8)** — the `ruff 2.toml` duplicate that reappeared in the fork has been deleted (2026-07-07), but the folder itself is still iCloud-synced, so recurrence is expected until this move happens. **Blocks all of Phase F.**
3. **Post the UP-0 maintainer buy-in issue** (after approving its contents) — outward-facing; gates PR-E (landing) + the platform theme. Renames/dep-removals need a maintainer 👍 first.
4. Carried from v1, still open: C02-T9 upstream-PR go-ahead; IRB consultation before the EV-4 pilot; PI review of the EV-1 instrument + EV-3 instructor pack; GOV-3 module-split stretch decision; IN-4 fork-docstring branch choice.
5. ~~**Consent/privacy sign-off (GOV-2, elevated)**~~ **[MOOT 2026-07-08]** — no student prompts transit to any third party anymore.

---

## Traceability: finding → tasks

| Council finding (source) | Tasks |
|---|---|
| Canvas has no display contract — one bug behind blur/tiny-text/2× speed (First Principles; all 5 touched it; measured) | FE-1, FE-2, FE-4 |
| Hardware-dependent gameplay reads as "the physics is broken" (Contrarian) | FE-1, FE-3 |
| Input silently dropped → "it's broken," tab closed at 0:15 (Outsider, Executor) | FE-3 |
| "Self-contained" claim currently false; offline classroom = broken layout (Contrarian; measured) | FE-5, FE-14b |
| Pixel font misread as typography system; retro ≠ illegible (First Principles) | FE-6, FE-4 |
| Real contrast debt is buttons/canvas labels/hue-coding — NOT the core text palette (measured; council corrected the user's broader framing) | FE-7, FE-8 |
| Mobile "not degraded — undesigned"; ship/no-ship must be explicit (Contrarian, peer-endorsed) | FE-9 |
| Board should own the viewport; void is a symptom (First Principles) | FE-10 |
| Sage truncation + duplicate log lines (screenshots) | FE-11 |
| Gate menu = jargon wall covering the board (Outsider) | FE-12, PED-2/4 |
| 90-word physics wall in default panel (Outsider) | FE-13, PED-1/3 |
| No acceptance tests behind done-whens (ALL peer reviewers) | FE-14 |
| Layout must be verified inside the Streamlit iframe (ALL peer reviewers) | FE-14d, FE-10 |
| A11y beyond contrast is a legal-exposure gap (peer review) | GOV-4 pulled forward |
| Scope-expansion trap: redesigns dressed as fixes (peer review, unanimous re: Expansionist) | Backlog BL-1..3 quarantine |
| "Unify the rendering" week-eater (Executor) | Constraint 6 |
| **Council #3 (platform):** proxy = "open wallet": spoofable XFF limit, CORS *, no cap/auth/TLS (Contrarian, Executor, Outsider; measured) | ~~BE-1, BE-2~~ **[MOOT — resolved by deletion, not hardening, 2026-07-08]** |
| Provider-side spend cap + key rotation = zero-code neutralizer (ALL peer reviewers — advisors missed it) | ~~BE-2 + human action~~ **[MOOT]** |
| Student prompts to a third-party API = privacy/consent pilot-blocker (peer review) | ~~GOV-2 elevated, EV-3~~ **[MOOT — no third-party API left]** |
| Pilot needs a Sage kill-switch (peer review) | ~~BE-2~~ **[MOOT — no live Sage to kill-switch]** |
| "No build artifact, only copies" — vendored blob, embed-height drift, rules ×3 are one decision (First Principles) | BE-4b, BE-5, BE-7 now; BL-4 later |
| Ungated second rAF loop = battery burn on target laptops; reduced-motion gap (Contrarian, Outsider; measured) | BE-3 |
| st.metric arrows teach students to misread UI (Outsider) | BE-4a |
| config.toml actively disables security (Contrarian; measured) | BE-6 |
| Planning files untracked + live iCloud sync over repos = institutional memory on one disk (First Principles, Outsider) | BE-8 |
| "Latency across all pages" claimed with 8/9 unaudited (Contrarian); audit one, then scope (Executor) | BE-9 |
| Sage gateway / qphysics.js / single-source build = scope expansion on an unsecured base (peer review, unanimous re: Expansionist) | BL-4..6 quarantine |
| **Council #4 (platform):** no page contract — "the site is `ls` in Streamlit" (First Principles, voted strongest 5/5) | UP-1, UP-2 |
| Landing = directory listing; VPN page hangs silently; biggest element links away (Outsider-student; measured) | UP-1 (banner), UP-2 |
| "Broaden the PRs" backfires twice: unreviewable + reads as takeover on a lab-owned repo (First Principles, Outsider-PI, Executor) | narrow PR-D..G + UP-0 issue-gating |
| "AI-feel" is the wrong goal — generic reads as AI-slop; fix is specificity not chatbots (Contrarian) | UP-2 content rule; BL-5 quarantine |
| 4 of 5 heavy pages recompute per widget twitch (Contrarian, Outsider; measured) | UP-3 |
| Cached qutip path can silently serve WRONG physics — worst failure for a teaching tool (peer review) | UP-3 regression guard |
| Every perf claim rests on assertion — measure before/after (ALL peer reviewers) | UP-4 |
| Contract decays back to 10 scripts once the contributor graduates (peer review) | UP-1 docs/PAGE_CONTRACT.md |
| Get maintainer buy-in before identity-touching code (Outsider-PI, Executor) | UP-0 |
| iCloud corruption is ONGOING (`ruff 2.toml` reappeared) — contaminates every PR at source (Contrarian, First Principles) | BE-8 (now Phase F prerequisite) |
| `st.navigation`/multipage restructure = week-eater breaking URLs + iframe path (Executor) | excluded from UP-2 |

## Suggested sequencing

*Two independent tracks. The Arena track (PR-A/C — PR-B cancelled, see Sage-removal callout) is David's game work; the platform track
(PR-D..G) is the lab-facing broadening the user asked for. They share no files, so they can run
in parallel — but both wait on the two zero-cost prerequisites below.*

**Prerequisites (do these first — cheap, and everything downstream depends on them):**
1. ~~**HUMAN, minutes, zero code:** set the Anthropic-console spend cap + note the key-rotation runbook (BE-2).~~ **[MOOT 2026-07-08 — no Anthropic key exists anymore.]**
2. **HUMAN + 30 min:** relocate both repos out of iCloud-synced paths (BE-8) — the `ruff 2.toml`
   duplicate that proved corruption is live has been deleted (2026-07-07), but the folder is
   still iCloud-synced, so this still blocks **all of Phase F** and risks any PR until done.
3. **HUMAN, outward-facing:** post the UP-0 maintainer issue (after approving its contents) so
   the identity-touching platform PRs (UP-2, theme) have a green light before you write them.

**Arena track (PR-A first):**
4. **Day 1:** FE-1 → FE-2 → FE-3 (architecture; FE-14a alongside FE-1) on new `arena-c03-fe` (PR-A).
5. **Day 2:** FE-4 → FE-5 → FE-7 → FE-8 (legibility + integrity; FE-14b/c alongside) + riders BE-3, BE-4.
6. **Then:** FE-6 sweep, FE-9 interstitial, FE-11 bug pair, BE-5 trim. Re-capture everything.
7. **Separate branches, any time:** ~~BE-1~~ (moot) + BE-6 (needs a new PR home, PR-B cancelled); BE-7 + BE-8 (PR-C); BE-9 audit when in the fork.
8. **After PR-A review opens:** Phase C layout (FE-10, FE-12, FE-13); FE-14d before FE-10 sign-off.

**Platform track (after prerequisites; PR-D/F/G don't need the issue, PR-E does):**
9. **PR-D (`platform-page-contract`):** UP-1 — the page contract + VPN banner. Lowest politics; start here.
10. **PR-F (`platform-perf-gating`):** UP-4 measure FIRST, then UP-3's four per-page recipes with the physics-regression guard.
11. **PR-G (`platform-cold-start`):** UP-5 lazy imports (uses UP-4's cold-start numbers).
12. **PR-E (`platform-home`):** UP-2 landing rebuild — only once UP-0's issue answers the identity questions.

**Pilot gate (updated 2026-07-08):** GOV-4 (accessibility) still gates any classroom pilot; GOV-2 and BE-1/BE-2 no longer do — they were about a live third-party API that no longer exists.
