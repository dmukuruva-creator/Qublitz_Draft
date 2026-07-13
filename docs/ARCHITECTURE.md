# Architecture map — `quantum_chess.html`

*A new contributor should be able to locate any subsystem below in under 5 minutes using this
map alone. Line numbers are anchors, not contracts — the file changes; when a number drifts,
search for the named function/section header (the file uses `// ═══...` banners for every major
section, so `grep -n "^// ═══"` regenerates this map's skeleton at any time) rather than trusting
the digit. Verified against the file as of 2026-07-12, 5,418 lines.*

## The one hard constraint every change here must respect

**`quantum_chess.html` stays a single file, openable standalone in Chrome via `file://`, with
zero network dependencies** — no CDN fonts, no external scripts, no API calls. Everything is
inlined: fonts as base64 `@font-face`, sprites as embedded pixel-art bitmaps, physics as a
self-contained module. This is why the file is 5,400+ lines instead of a dozen smaller ones —
splitting it into real ES modules would need a build step, which is exactly the trade this
constraint deliberately refuses (see the `docs/PR_REVIEW_GUIDE.md` in the fork for the reviewer-facing
version of this same note, and `BL-4`/`BL-6` in `HANDOFF.md`'s backlog for the two "single-source
build" and "extract `qphysics.js`" proposals this constraint currently blocks — both are
real, both are scoped as future work, neither is started).

Two repos, one canonical copy: this file (`QuBlitz Project/quantum_chess.html`) is the source of
truth; the fork vendors a copy at `pages/_assets/quantum_chess.html`. `scripts/sync_vendor.sh`
(BE-7) keeps them byte-identical — edit here, sync there, never the reverse.

## Module map

| Subsystem | Lines (approx) | What it is |
|---|---|---|
| Audio engine | 1092–1150 | Web Audio API, lazy-initialized on first click (autoplay policy) |
| Constants | 1151–1188 | `GRID`, `CELL`, `BOARD`, `MOVE_RANGE`, timing constants |
| Embedded art | 1189–1213 | Boot-screen backdrop bitmap only |
| Complex-number helpers (`C`) | 1214–1253 | `{r,i}` pair arithmetic — add/sub/mul/scale/norm/fromPolar. Everything below builds on this. |
| Qubit state helpers | 1254–1264 | `blochToState`/`stateToBloch`, the Bloch-vector ↔ state-vector bridge |
| `GATES` | 1265–1303 | The 8 charge gates (H/X/Y/Z/S/T/Rx/Ry) as pure state transforms |
| `GATE_INFO` | 1304–1350 | Single source for every gate's `label`/`short`/`effect`/`ctrl` text — the gate menu, Gate Log tooltips (PED-2), and the in-game glossary (PED-4) all read this ONE object, never a second copy |
| **`QPhysics`** | 1404–1626 | The physics engine. Self-contained, unit-tested independently of the DOM (`tests/qphysics.test.js` extracts just this block + its dependencies and runs it headless). Covers: Bloch↔pure↔ρ conversions, `charge`/`guardCritProb`/`purity`/`coherenceL1`, the Lindblad master-equation step (`lindbladStep`), Bell-pair math, the falsifiability diagnostic (`diagnose`), and (BR-3) `rabiPopulation`/`rabiRotateState` for the Pulse Forge minigame. |
| **`BotAI`** | 1642–1831 | The bot's decision policy, ALSO fully extractable and headlessly testable (`tests/bot_guard_harness.test.js` drives it directly). `chooseAction()` is the actual decision tree; `pickTarget()`/`scoreMoveSpots()` handle targeting/movement; `resolveAttack()` is the pure combat-resolution math the browser AND the test harness both call, so they can never disagree about who gets crit. |
| Pixel-art sprites | 1834–1912 | 7×9 bitmap sheets, embedded |
| Piece/unit factory | 1913–1982 | `createUnit()`, army setup (Knights vs Mages) |
| **`GAME`** | 2090–2134 | The single mutable game-state object everything reads/writes. `pieces`, `turn`, `phase`, `selected`, `kbCursor` (GOV-4), `gateCounts`, `campaignMission`, etc. |
| `resetGame()` | 2135 | Rebuilds `GAME` for a new match/mission |
| Board helpers | 2176–2259 | `unitAt`, BFS movement (`reachableTiles`), adjacency, counts |
| Particles | 2260–2285 | Visual-only, decorative |
| **Turn logic** | 2286–2442 | `applyGate()` (2379), `applyMeasure()`, `applyCNOT()` — the core "spend a turn" actions |
| **Combat** | 2443–2591 | `attack()` (2496) — fire roll, GUARD-aware collapse, crit, damage, entanglement splash. Delegates the actual math to `BotAI.resolveAttack()` (shared with the bot/harness). `endTurn()` (2650, `async`) — decoherence tick, debrief text, campaign win-check. |
| Win condition | 2592–2713 | Elimination + turn-cap forced decision |
| **Bot AI (game-side glue)** | 2714–2806 | `doBotMove()` — wires `BotAI`'s pure functions into the real `GAME` state |
| **Rendering** | 2807–3537 | `drawBoard()` (2885) — the entire canvas draw call: board, units, gate menu, keyboard cursor (GOV-4), selection rings, HUD overlays |
| Bloch sphere panel | 3538–3588 | `drawBloch()` — the small side-panel canvas (PED-1 added the caption/tooltip) |
| HUD | 3589–3686 | `updateHUD()` — DOM text updates + `#a11y-status` (screen-reader turn summary, QB-8) |
| Log | 3687–3709 | `logEv()` — the on-screen event log |
| Gate menu logic | 3710–3805 | `openGateMenu()`, `handleGateClick()` — builds/dispatches the canvas-drawn action menu |
| **Input — click** | 3806–3911 | The `canvas.addEventListener('click', ...)` handler — selection, movement, attack/entangle targeting. The single most load-bearing input handler in the file; GOV-4's keyboard cursor deliberately reuses this via a synthetic `MouseEvent` rather than duplicating its logic. |
| **Input — keyboard** | 3912–4059 | The main `document.addEventListener('keydown', ...)` handler — hotkeys, gate-menu shortcuts, and (GOV-4) arrow-key board navigation + Enter/Space activation |
| Main game loop | 4060–4112 | `loop(ts)` — the `requestAnimationFrame` driver, delta-time based (FE-1) |
| Floating combat text | 4113–4141 | Damage/crit/miss numbers |
| Blitz turn timer | 4142–4194 | Optional speed-mode countdown |
| Leaderboard | 4195–4225 | `localStorage`-backed personal bests — see `docs/DATA_AND_CONSENT.md` (GOV-2) for exactly what this stores |
| **Campaign / training missions** | 4226–4353 | `CAMPAIGN_MISSIONS` (4229) — all 7 missions (Mission 7 is BR-3's Pulse Forge), `startMission()`, `openCampaign()` |
| Crowd/audience vote mode | 4354–4476 | Multiplayer-audience input mode |
| Background particle system | 4477–4624 | `animateBg()` — the decorative ambient canvas, reduced-motion-aware (BE-3) |
| Attract mode | 4625–4662 | Idle-screen demo |
| **Quantum Sage advisor** | 4663–4876 | `analyzePosition()` (4670) — the offline heuristic tip engine (no LLM, no network — the live-Claude-Sage proxy path was removed entirely in the 2026-07-08 ruling, see `HANDOFF.md`). `renderSage()` (4751) drives the typewriter-effect dialogue bar. |
| Boot sequence | 4877–4983 | Splash screen, phone-unsupported interstitial (FE-9) |
| **Menu + tutorial modals** | 4984–5054 | Main menu, Physics Lab (PED-5's chart-first reorder), glossary (`openGlossaryIndex()`, PED-4), the TOME (`openTutorial()`, 5293) |
| **Pulse Forge (BR-3)** | 5055–5346 | Mission 7's control-layer minigame — pulse-shaping UI, canvas visualization, `applyPulseForge()` |
| Init | 5347–end | `window.addEventListener('load', ...)` — the one true entry point; boots fonts, background, the boot sequence, and (BR-1) `importSimulatorParams()` |

## How the test suite maps to this file

Every headless test in `tests/` extracts a specific slice of this file by regex block-matching
(never a copy-paste duplicate) and runs it in Node with no DOM:

- `qphysics.test.js` → `C` + `GATES` + `QPhysics`
- `bot_guard_harness.test.js` → `C` + `GATES` + `QPhysics` + `BotAI`, driving a headless
  board/turn simulator built around them
- `mission_shield_harness.test.js`, `debrief_harness.test.js`, `coherence_budget_harness.test.js`
  → similar, scoped to their own named subsystem

The browser-based tests (`live_regression_check.js`, `offline_check.js`, `contrast_check.js`,
`capture_responsive.js`) drive the real file via Playwright/Chromium instead of extracting from
it — they're the ones that actually load `<script>` and exercise rendering/input end to end.

## Ownership note (the peer-review question this doc exists to answer)

There is no dedicated maintainer beyond whoever is actively working the `HANDOFF.md` queue.
This map is the primary mitigation for "who owns this after the author graduates" — a new
contributor's onboarding path is: read this file, then `HANDOFF.md` for what's actually in
flight, then `tests/` for how each subsystem is independently verified. The "optional stretch"
this task's own spec named — splitting the file into real ES modules behind a byte-equivalent
build step — is a genuine, larger decision (changes the contributor workflow, needs CI
enforcement that the build output matches) and is deliberately NOT done here; it's `BL-4`/`BL-6`
in `HANDOFF.md`'s backlog, gated on an explicit go-ahead.