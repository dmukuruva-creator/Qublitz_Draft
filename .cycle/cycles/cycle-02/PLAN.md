# Cycle 02 Plan — QuBlitz Arena: gated, academic, and intuitive
*Traces to GOALS.md: "QuBlitz Arena is a working Streamlit page… embeds the game via
`st.components.v1.html`, Sage runs server-side via `st.secrets`" / "Sage gives pre-move advice
(QB-11)" / "Every PR… includes docstrings + description". Extends the user's gate-1 directive:
NO upstream PR until tests + CI + debugging gates exist (C01-T5 carried here as C02-T9).*
*Approved: gate-1 PASSED 2026-06-13 — SCOPE = core-first (run T1–T5, T7, T9; DEFER T6 + T8 to C03);
SAGE BACKEND = inline in Streamlit via st.secrets (no separate proxy process). See DECISIONS.md.*

## Shape of the cycle
Three bands, run in order. **Band A (gates) is the prerequisite the user set for shipping** —
nothing pushes upstream until A is green. **Band B** makes the Arena page academic + well-
presented and embeds the live game. **Band C** makes the Sage genuinely intuitive (including the
offline heuristic, since the standalone file ships with no LLM). **C02-T9** opens the PR only
after A–C pass.

Recommended split if scope runs long: **core C02 = T1–T5, T7, T9** (gates + embed + academic
framing + Sage intuition + PR); **defer T6 + T8 to C03** (deeper visual redesign + Sage coaching
UX). Flagged per-task below as [CORE] / [STRETCH].

---

## Band A — Quality gates (prerequisite; build before any push)

### C02-T1 — Streamlit smoke-test harness for the fork  [CORE]
- What: Add `tests/test_pages_smoke.py` in the fork using `streamlit.testing.v1.AppTest`. For
  every entry (`home.py` + each `pages/*.py`), assert the script runs with **no uncaught
  exception** (`at.run(); assert not at.exception`). Add a focused
  `tests/test_qublitz_arena.py` asserting the Arena page renders its title + the C02 embed marker
  and raises nothing. Add `pytest`, `pytest` config, and a `requirements-dev.txt`.
- Done when: `pytest -q` passes locally in the 3.12 venv; the Arena test fails loudly if the page
  throws or the embed marker is missing.
- Fails if: any page raises on load, or the harness can't import the app.
- Risk: medium — `mesolve`/auto-sim pages may be slow or trigger heavy compute under AppTest;
  mitigate by setting a small default and, if needed, marking the two simulator pages `slow` and
  smoke-testing import-only for those.

### C02-T2 — CI workflow on the fork branch  [CORE]
- What: Add `.github/workflows/ci.yml` to the fork that, on push/PR to `feature/qublitz-arena`
  and `main`: (1) sets up Python 3.12, installs `requirements.txt` + `requirements-dev.txt`
  (cache pip), (2) runs `ruff check` (lint) + `pytest -q` (smoke), (3) runs the **game's** JS
  physics test if `quantum_chess.html` is vendored for the embed (see T4) via Node 20. Pin the
  qutip source-build workaround (system openblas) in a comment.
- Done when: the workflow file is valid (`actions/checkout@v4`, `setup-python@v5`), green on a
  test push to the fork branch; a deliberately-broken page turns CI red.
- Fails if: CI can't install deps (qutip build) or the workflow is malformed.
- Risk: medium — qutip 4.7.6 has no cp312 wheel; CI must `apt-get install libopenblas-dev` (or
  pin a qutip that wheels on 3.12) so the build succeeds on ubuntu-latest. Document whichever path.

### C02-T3 — Local debugging gate: one-command verify + pre-push doc  [CORE]
- What: Add `scripts/verify.sh` (or `make check`) in the fork that runs lint + smoke tests + (if
  present) the JS physics test, and prints a single PASS/FAIL. Add a short `CONTRIBUTING.md`
  section: "run `scripts/verify.sh` green before any push or PR." This is the human-facing
  debugging gate the user requires before shipping.
- Done when: `bash scripts/verify.sh` returns 0 on a clean tree and non-zero when a test is broken;
  CONTRIBUTING documents it.
- Fails if: the script greenlights a tree with a failing test.
- Risk: low.

---

## Band B — Academic Arena page + live game embed

### C02-T4 — Embed the live game via `st.components.v1.html` + Sage proxy wiring  [CORE]
- What: Replace the Arena stub body with the real embed. Vendor `quantum_chess.html` into the
  fork (e.g. `pages/_assets/quantum_chess.html`, kept in sync with the canonical file), read it,
  and render via `st.components.v1.html(html, height=…, scrolling=True)`. Wire the Sage server-
  side: read the key from `st.secrets["anthropic"]["api_key"]` (or `QB_SAGE_PROXY_URL`), inject
  `window.QB_SAGE_PROXY` before the iframe loads — **never** put the key in client HTML. Graceful
  fallback text when no secret is configured (heuristic Sage still plays). Mirror `app.py`'s
  existing `_sage_proxy_url()` approach.
- Done when: running the fork locally, the Arena page shows the playable board in the iframe; with
  a secret set the Sage shows "Connected ✓"; with none, the page still loads and the game plays on
  the heuristic Sage. No key appears in page source.
- Fails if: iframe is blank, key leaks into client HTML, or page errors without a secret.
- Risk: medium — iframe height/responsiveness and Streamlit Cloud's CSP; tune height and test in
  Chrome + Firefox (GOALS quality bar).

### C02-T5 — Academic framing on the Arena page  [CORE]
- What: Above/below the embed, add a concise scholarly frame: (1) **Learning objectives** ("by
  playing you will reason about superposition, the Born rule, Bloch-sphere state, T₁/T₂
  decoherence, relative phase, and entanglement"); (2) a **concept map** table mapping each game
  action → the quantum concept it teaches → the in-engine formula (e.g. MEASURE → projective
  Z-basis collapse; idle turn → `e^(−t/T₁)` relaxation; GUARD → X-basis crit `(1−x)/2`); (3) a
  **"the physics is real"** callout linking to the in-game Physics Lab and the unit-tested engine
  (`tests/qphysics.test.js`, R²>0.99 decoherence, Bell correlation); (4) **research context** —
  FitzLab attribution and the proposal's RQs (BCTDS→T₂, non-Markovian/HEOM), framing the game as
  the interactive companion to the simulator. Use `st.expander`s so it reads as optional depth, WCAG-AA contrast.
- Done when: the page reads as an academic learning tool, not just a game; concept map renders;
  all links resolve; contrast checked.
- Fails if: framing is decorative only (no concept→formula mapping) or links 404.
- Risk: low.

### C02-T6 — In-game visual presentation pass  [STRETCH → may move to C03]
- What: Tighten the game's visual presentation for an academic audience without UX rewrite
  (GOALS non-goal: no layout/branding rewrite). Candidates, lowest-risk first: a persistent
  **concept legend** (gate → one-line meaning) toggle; emphasize the **Bloch sphere** panel
  (label axes |0⟩/|1⟩/|+⟩/|−⟩, show live charge/coherence numerically); ensure consistent theming
  with the simulator's palette where it touches the Arena frame; reduced-motion + ≥11px font audit
  (already largely done in QB-8). Each change guarded by the physics test staying green.
- Done when: legend + labeled Bloch sphere ship; `node tests/qphysics.test.js` still passes; no
  regression to responsive layout.
- Fails if: any change breaks the physics tests or the responsive grid, or alters core UX/branding.
- Risk: medium — touching the canvas/CSS; keep diffs small and test after each.

---

## Band C — Intuitive Sage assistance

### C02-T7 — Sage intuition upgrade (heuristic + LLM)  [CORE]
- What: The standalone file ships **without** a server, so the LLM Sage is off and only the
  heuristic `renderSage()` tips show — make those genuinely useful. (1) Strengthen the heuristic to
  give **pre-move, state-aware** advice: read the selected unit's charge / superposition /
  coherence / adjacent enemies / GUARD exposure and recommend the single best action *with the
  quantum reason* ("X to fully charge before striking — you're at 38%", "you're |−⟩ on GUARD —
  Z to flip safe"). (2) Improve the LLM `SYSTEM_PROMPT` in `sage_proxy.py` for pedagogy: explain
  the *why* in one concept-linked sentence, never just the move. (3) Tie tips to the concept
  vocabulary from T5 so advice teaches, not just instructs.
- Done when: with no proxy configured, selecting a unit yields a specific, correct, concept-linked
  tip (not a generic line); the heuristic never contradicts the engine (e.g. won't advise attack at
  0% charge); physics tests green.
- Fails if: heuristic gives generic/contradictory advice, or changes break combat logic.
- Risk: medium — heuristic must stay consistent with real engine state; cover with a small JS
  assertion in `tests/qphysics.test.js` (or a new `tests/sage.test.js`) for a few states.

### C02-T8 — Sage UX: pre-move trigger + "explain this" + coaching toggle  [STRETCH → may move to C03]
- What: Surface the assistance better. (1) Fire pre-move advice on unit **selection** for the
  heuristic path too (today `maybePreMoveSage` early-returns unless `_sageEnabled()`); (2) add an
  **"Explain this"** affordance on the selected unit / last move that expands the reasoning + the
  relevant concept; (3) a **Coaching mode** toggle (verbose teaching vs terse) persisted in the
  menu. Keep the existing Sage bar/portrait styling.
- Done when: selecting a unit (no LLM) shows a contextual tip immediately; "Explain this" reveals
  concept-linked reasoning; coaching toggle persists; physics tests green.
- Fails if: pre-move tips spam/flicker, or the toggle doesn't persist, or combat regresses.
- Risk: low–medium.

---

## Band B2 — Latency + whole-experience fixes (pulled forward from C03 per user directive)
*The single upstream PR must bundle these with the embed. Each fix lands on `feature/qublitz-arena`,
guarded by the T1 smoke tests + measured before/after where noted. Order: P0 → P1 → P2.*

### C02-T10 — P0: cache the simulator's hot path  [CORE]
- What: `@st.cache_data` on `run_quantum_simulation` (keyed on scalar params + a hash of the pulse
  envelope) so identical reruns are instant; parallelize `run_frequency_sweep` with a
  `ThreadPoolExecutor` + `st.progress` on the frequency tab; replace per-step `np.random.choice`
  shot sampling with a single vectorized `np.random.binomial`.
- Done when: a repeated identical run returns from cache (assert via a timing log / cache hit);
  sweep shows progress; outputs unchanged vs. baseline within tolerance.
- Fails if: cached results differ from uncached, or sweep regresses numerically.
- Risk: medium — cache key must be exhaustive; verify identical output.

### C02-T11 — P0: remove dead heavy imports in IQ_mixer  [CORE]
- What: Delete the unused `qutip` (×2) and `matplotlib` imports in `pages/IQ_mixer.py`; confirm
  the page uses only numpy + scipy.fft. Measure cold-load improvement.
- Done when: page renders identically; `grep qutip pages/IQ_mixer.py` empty; smoke test green.
- Fails if: any removed symbol was actually used. Risk: low.

### C02-T12 — P1: deduplicate Custom_Qubit_Query / Qubit_Simulator + kill auto-sim-on-load  [CORE]
- What: The two pages are near-identical and auto-fire `mesolve` on first load. Extract the shared
  body into one module both import, namespacing session-state keys per page to stop cross-
  contamination; gate the initial simulation behind a "Run simulation" button (cheap zero-amp
  placeholder until then). Keep the Custom page's API path intact (it talks to a lab backend).
- Done when: both pages share one implementation; fresh load does NOT run mesolve; navigating
  between them no longer leaks results; smoke/compile checks green.
- Fails if: a fix must still be applied twice, or load still auto-solves.
- Risk: medium — session-state key collisions; test both pages.

### C02-T13 — P2: cheap-win cleanups  [CORE]
- What: `@st.cache_resource` shared sidebar-image loader across all pages; fix `Sonify.py`
  temp-WAV leak (move generation behind a button / cache on params); `@st.cache_data` on the
  EP/TPD 500×500 meshgrid; replace `from streamlit import *` wildcard in
  `Quantum_Measurement_Tutorial.py` with explicit imports.
- Done when: each cleanup applied; pages render unchanged; smoke tests green; no temp files
  accumulate on repeated Sonify interaction.
- Fails if: any page visually/functionally regresses. Risk: low–medium.

## Band D — Ship (ONE comprehensive PR; only after A, B, B2, C all green)

### C02-T9 — Push fork branch + open the single comprehensive PR to mvwf/qublitz  [CORE]
- What: With `scripts/verify.sh` and CI green AND embed + latency + improvements all landed, push
  `feature/qublitz-arena` and open ONE PR → `mvwf/qublitz:main` bundling: the academic Arena page
  + live embed + inline-Streamlit Sage, the P0/P1/P2 latency fixes, and the cleanup improvements.
  PR body: what/why/how-to-test per area, before/after latency numbers, screenshots (sidebar, Arena
  page, a board frame), CI-green note. Update docstrings on changed functions. **Confirm with the
  user before opening the upstream PR** (outward-facing, third-party public repo).
- Done when: one PR open at github.com/mvwf/qublitz/pulls covering all of the above, fork CI green,
  no conflicts, complete description + screenshots.
- Fails if: gates aren't green, scope is split across multiple PRs, or description/screenshots missing.
- Risk: low — gated behind everything above + explicit user confirmation.

## Will NOT do (this cycle)
- No game-physics changes beyond Sage-consistency (QB-10 T1-slider stays C05).
- No UX/branding rewrite of existing pages (GOALS non-goal).
- No "Try this in the game" bridge cross-links yet (C04 Bridge tier).
- T6 (in-game visual pass) + T8 (Sage coaching UX) deferred to C03 per gate-1 scope ruling.

## Verification plan (audit will run these)
- `pytest -q` in the fork — all page smoke tests pass; Arena test passes.
- `bash scripts/verify.sh` — returns 0; returns non-zero when a test is broken.
- Fork CI run green (`gh run list --branch feature/qublitz-arena`).
- `grep -i "anthropic\|api_key\|secret" <rendered Arena page source>` — **no key present**.
- `node tests/qphysics.test.js` (game repo) — ALL CHECKS PASSED (and any new Sage assertions).
- Arena page in Chrome + Firefox — embed plays; concept map + objectives render; WCAG-AA contrast.
- (T9) PR URL reachable with description + screenshots; CI green on the PR.

## Open scope question for gate-1
Whether to run the **full** band set this cycle (T1–T9) or the **core** subset (T1–T5, T7, T9) and
push T6 + T8 visual/Sage-UX polish to C03. Recommend core-first to land a shippable, gated,
academic Arena quickly, then iterate on polish.
