# GOALS — QuBlitz + mvwf/qublitz Integration & Improvement
*Locked at INIT on 2026-06-13. Agent may propose amendments in cycle reports but never edits this file.*

## Mission
Ship QuBlitz (the quantum battle game) as a working page on the Fitzpatrick Lab's deployed
Streamlit app (qublitz-qubit-lab.streamlit.app) via a fork + PR to mvwf/qublitz. Simultaneously,
improve latency, visualization quality, and code hygiene across the entire mvwf/qublitz repo
(all existing pages) so the platform is fast, maintainable, and educationally effective.
David's contribution is the QuBlitz Arena page and its subsequent game-linked pages.

## Done means
- QuBlitz Arena is a working Streamlit page in a PR against mvwf/qublitz, embeds the game via
  `st.components.v1.html`, and the Sage AI runs server-side via `st.secrets` — no browser API key
- All 10 commits on `handoff/qublitz` are merged to `main` in the Qublitz_Draft repo and pushed;
  repo is tagged v1.1.0 with a proper README.md
- `quantum_simulator.py`'s `run_quantum_simulation` is wrapped with `@st.cache_data` so repeated
  calls with identical parameters do not re-run `mesolve`
- `IQ_mixer.py`'s dead qutip and matplotlib imports are removed; page cold-load time improves
- `Custom_Qubit_Query.py` and `Qubit_Simulator.py` are deduplicated (one imports the other, or
  they share a common module) so bug fixes only need to happen once
- `Image.open` sidebar calls are cached with `@st.cache_resource` across all pages
- Decoherence in the game uses `exp(-dt/T1)` with a tunable T1 parameter (QB-10)
- The Sage gives pre-move advice on unit selection, not just post-move (QB-11)
- Gate tooltip descriptions in GAME_INFO match actual code behavior (QB-3)
- Every PR against mvwf/qublitz includes: clear commit messages, docstring updates for changed
  functions, and a PR description explaining what changed and why

## Non-goals
- No rewrite of the simulator's existing page UX (layout, color scheme, branding) — improve
  performance and correctness only; add new pages
- No multiplayer server infrastructure for the game (PeerJS P2P remains acceptable)
- No unification of JS QPhysics and qutip backends (too large; deferred post-C06)
- No new game modes beyond what is proposed in Project_Description.md cycles C01–C06
- No removal of the Streamlit layer from the game (the iframe embed approach is sufficient)

## Quality bars
- Physics tests (`node tests/qphysics.test.js`) pass on every commit to Qublitz_Draft
- Game loads and plays correctly in Chrome and Firefox within the Streamlit iframe
- No API keys in client-side code or committed files; Sage key via `st.secrets` only
- Every commit to either repo has a meaningful message following the pattern:
  `SCOPE: imperative description (ticket-id)` e.g. `perf: cache mesolve in quantum_simulator (SIM-P0-1)`
- PRs to mvwf/qublitz have a description with: what changed, why, how to test, screenshots where applicable
- WCAG AA contrast (4.5:1) on all new UI elements
- `streamlit run Home.py` produces no import warnings or errors after any change
