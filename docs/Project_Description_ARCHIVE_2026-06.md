# QuBlitz — Project Description

> **Last updated:** June 2026
> **Author:** David Mukuruva (dmukuruva@gmail.com)
> **Research context:** Fitzpatrick Lab, Dartmouth College (PI: Prof. Mattias Fitzpatrick)

---

## 1. What QuBlitz Is

QuBlitz is a quantum tactics game where every unit on the board is a qubit, every action is a
quantum gate, and combat resolves via the Born rule. It was built to make quantum mechanics
intuitive by making it *consequential* — you understand decoherence the moment your charged
unit relaxes and you miss a kill.

The project exists in two parts that work together under the Fitzpatrick Lab umbrella:

| Repo | What it is | Stack | Status |
|---|---|---|---|
| [mvwf/qublitz](https://github.com/mvwf/qublitz) | Fitzpatrick Lab's Streamlit qubit simulator | Python, qutip, Streamlit | Live at [qublitz-qubit-lab.streamlit.app](https://qublitz-qubit-lab.streamlit.app) |
| [dmukuruva-creator/Qublitz_Draft](https://github.com/dmukuruva-creator/Qublitz_Draft) | The battle game | Vanilla JS, HTML canvas, Streamlit wrapper | Local on `handoff/qublitz`; merge + PR pending |

David's contribution to the main repo is the **QuBlitz Arena** page (and subsequent
game-linked pages). The simulator teaches qubit physics through parameter exploration; the
game teaches qubit intuition by forcing players to use gates to win. They belong on the same
platform.

---

## 2. Current State of the Game Repo (Qublitz_Draft)

### Git status

- **Active branch:** `handoff/qublitz` — 10 commits ahead of `origin/main`
- **`origin/main`:** at `e962973` (pre-HANDOFF state, pre-CI, no README)
- **Action needed:** merge `handoff/qublitz` → `main`, push, tag `v1.1.0`

### Commits on `handoff/qublitz` not yet in main

| Commit | ID | What changed |
|---|---|---|
| QB-1 | `dd5bc28` | Fixed crash: `doAttack()` → `attack()` — crowd-vote now works |
| QB-2 | `31539fe` | Removed dead features: replay export, broken networked 2P, false check-warn alerts |
| QB-5 | `6a28d0b` | Phase mechanic real: Z/S/T gates matter via X-basis GUARD (crit risk = (1−x)/2) |
| QB-4 | `cd684c1` | Responsive layout: CSS grid replaces hardcoded 800px canvas |
| QB-6 | `4d54972` | Real Bell state: CNOT creates proper 4-component entangled state; no-comm enforced |
| QB-7 | `24c461d` | Bot uses full action set (H, X, CNOT, GUARD, MEASURE) — teaches by example |
| QB-8 | `7ab4e37` | Accessibility: WCAG AA contrast, ARIA roles, reduced-motion guard |
| HY-1 | `4bee341` | `package.json` + CI: `node tests/qphysics.test.js` on every push |
| QB-9 | `ead4d3e` | `sage_proxy.py`: Sage API key moved server-side (no browser key exposure) |
| QB-8c | `aac224a` | Fonts ≥11px throughout; colorblind-safe unit markers (shape + color) |

### File inventory (current `handoff/qublitz`)

- `quantum_chess.html` — 3,962 lines, canonical game (all fixes applied)
- `app.py` — 367 lines, Streamlit wrapper
- `sage_proxy.py` — server-side Anthropic proxy with per-IP rate limiting
- `tests/qphysics.test.js` — regression tests: exponential decoherence, Bell state, phase
- `package.json` — v1.1.0
- `.github/workflows/ci.yml` — runs physics tests on push
- `screenshots/` — 22 screenshots for README/demo use
- `DEMO_SCRIPT.md`, `QuBlitz_Context_Package.md`, `MukuruvaDavid_proposal.tex`
- **No README.md** ← most critical missing piece

---

## 3. Current State of the Main Repo (mvwf/qublitz)

### Pages and file sizes

| Page file | Lines | Primary deps | Latency severity |
|---|---|---|---|
| `quantum_simulator.py` | ~110 | qutip (`mesolve`) | **CRITICAL** |
| `pages/Custom_Qubit_Query.py` | ~1,350 | qutip via simulator, scipy | **CRITICAL** |
| `pages/Qubit_Simulator.py` | ~1,350 | qutip via simulator, scipy | **CRITICAL** (duplicate of above) |
| `pages/IQ_mixer.py` | ~120 | qutip (unused!), matplotlib (unused!) | **HIGH** |
| `pages/EP_TPD_exploration.py` | ~280 | numpy, custom utils | MEDIUM |
| `pages/Sonify.py` | ~180 | PIL, soundfile | MEDIUM |
| `pages/Quantum_Measurement_Tutorial.py` | ~260 | numpy, plotly | LOW-MEDIUM |
| `pages/Dilution_Refrigerator_Noise_Explorer.py` | ~380 | numpy, pandas | LOW |
| `pages/Laser_Heating_Calculator.py` | ~350 | math only | NONE |
| `home.py` | ~20 | PIL | NONE |

**Dependencies:** streamlit==1.39.0, plotly==5.24.1, numpy==1.26.4, scipy==1.12.0,
pandas==2.2.3, qutip==4.7.6, soundfile==0.12.1, librosa==0.10.2.post1, pyarrow==23.0.1

---

## 4. Latency Audit — All Hotspots Identified

### P0 — Fix immediately (blocks every user interaction)

**`quantum_simulator.py` — zero caching on the most expensive call in the entire app**

`run_quantum_simulation()` calls QuTiP `mesolve()` with `nsteps=10000` on every Streamlit
rerun. No `@st.cache_data` decorator anywhere in the file. Every widget interaction that
triggers a rerun (slider move, button press, tab switch) fires a fresh ODE solve. This is
the root cause of the 3–15 second interaction latency on both simulator pages.

Fix: `@st.cache_data` on `run_quantum_simulation` keyed on all scalar parameters + a hash
of the pulse envelope list. Cached calls return instantly for identical inputs.

`run_frequency_sweep()` calls `run_quantum_simulation` up to 201 times sequentially in a
blocking Python loop — no parallelism, no progress bar on the frequency tab (only on Ramsey).
Fix: `concurrent.futures.ThreadPoolExecutor` for the sweep; add `st.progress` on frequency tab.

Shot sampling: `np.random.choice` is called once per time step (up to 5,000 separate calls
per simulation). Fix: replace with a single vectorized `np.random.binomial(1, probs)` call.

**`pages/IQ_mixer.py` — dead qutip and matplotlib imports**

```python
from qutip import basis, sigmaz, sigmax, sigmay, mesolve, sigmam, Options
from qutip import *         # imports entire qutip namespace a second time
import matplotlib.pyplot as plt
from matplotlib import use
from matplotlib.widgets import Slider
```

None of these symbols are used anywhere in the page. QuTiP is a heavy library (imports
Cython extensions, scipy sparse, etc.) — importing it twice for an IQ mixing demo that only
uses numpy and scipy.fft adds significant cold-load time to every visit. Remove entirely.

### P1 — High impact

**`Custom_Qubit_Query.py` and `Qubit_Simulator.py` are byte-for-byte identical.**

They share the same function names, same session state keys (`td_target`, `td_ptype`, `td_amp`,
`freq_out`, etc.), and the same `page()` invocation. Any change must currently be applied in
two places. Worse: navigating between these pages causes session state cross-contamination —
results from one appear on the other. Fix: deduplicate into a shared module; each page imports
and calls it with a unique namespace prefix for session state keys.

**Auto-simulation on first page load.**

In both pages, the `page()` function fires `mesolve` automatically when `td_out` is None —
which is the state on every fresh page load or browser refresh. A user who navigates to the
Qubit Simulator page just to look at it triggers a full ODE solve before touching anything.
Fix: gate the initial simulation behind a "Run simulation" button; pre-populate with a cheap
zero-amplitude placeholder.

### P2 — Medium impact

**`Image.open` on every rerun across all 8 pages.**

Every page calls `Image.open("images/qublitz.png")` and `Image.open("images/logo.png")` in
the sidebar on every Streamlit rerun. Fix: one `@st.cache_resource` helper function shared
across all pages.

**`Sonify.py` temp file leak.**

`generate_audio()` is called unconditionally (not inside a button handler) and writes a new
WAV file to a temp path with `delete=False` on every slider interaction. Files accumulate on
the server with no cleanup. Fix: move audio generation inside a button click or use
`st.cache_data` keyed on audio parameters.

**`EP_TPD_exploration.py` 500×500 grid recomputed on every slider move.**

The `meshgrid`, `Delta_tilde_lambda`, `K_2_tilde`, and related fields (250,000-element
complex arrays) are rebuilt unconditionally. A 2,000-iteration Python loop for the second
plot adds to this. Fix: `@st.cache_data` on the grid computation; vectorize the loop.

**`Quantum_Measurement_Tutorial.py` wildcard import.**

`from streamlit import *` imports the entire Streamlit namespace at module level, polluting
globals and adding measurable startup cost. Fix: replace with explicit imports.

### P3 — Minor / cleanup

- `Sonify.py`: vectorize `generate_modulated_matrix` (Python for-loop over rows → numpy broadcast)
- `Sonify.py`: deduplicate the `img_gray`/`gray0` double computation
- `EP_TPD_exploration.py`: replace the 2,000-step Python loop with vectorized numpy calls to
  `peak_location` and `eigenvalues`
- All pages: add `st.spinner` context around `run_frequency_sweep` on the frequency tab
  (Ramsey tab has a spinner; frequency tab does not)

---

## 5. Integration Plan: QuBlitz Arena in mvwf/qublitz

### Deployment path

The game will live as a new Streamlit page `pages/QuBlitz_Arena.py` in the mvwf/qublitz repo,
contributed via fork + PR. The existing Streamlit Cloud deployment
(qublitz-qubit-lab.streamlit.app) will automatically pick up the new page once the PR merges.

### Sage AI in Streamlit

The current game reads an API key from localStorage. In the Streamlit context, the key goes
in `.streamlit/secrets.toml` on the server:

```toml
[anthropic]
api_key = "sk-ant-..."
```

`sage_proxy.py` (already written) is adapted to run as a subprocess alongside the Streamlit
server, or the proxy logic is inlined into a Streamlit API route using `st.experimental_singleton`.
The game JavaScript is given `window.QB_SAGE_PROXY` pointing to the proxy endpoint before the
iframe loads — Streamlit injects this via `st.components.v1.html()`.

### Three integration tiers

| Tier | What | Effort | Cycle |
|---|---|---|---|
| A — Stub | Page exists in sidebar, shows description + placeholder | 1 hour | C01 |
| B — Embed | Full game in iframe via `st.components.v1.html()`, Sage wired | half day | C02 |
| C — Bridge | "Try this qubit in the game" links from simulator pages; shared T1/T2 params | 1–2 sprints | C04+ |

---

## 6. Improvement Roadmap by Cycle

### C01 — Repo foundations (this cycle, awaiting Gate 1 approval)

1. Write README.md for Qublitz_Draft
2. Merge `handoff/qublitz` → `main`, push, tag v1.1.0
3. Fork mvwf/qublitz, set up local clone, verify app starts
4. Add QuBlitz Arena stub page to the fork
5. Open PR against mvwf/qublitz

### C02 — QuBlitz Arena: full game embed + Sage proxy

1. Embed `quantum_chess.html` via `st.components.v1.html()` in the Arena page
2. Wire `sage_proxy.py` to run server-side; inject `QB_SAGE_PROXY` URL into the iframe
3. Tune iframe height and responsive layout
4. Update PR with full embed

### C03 — P0/P1 latency fixes (mvwf/qublitz)

1. `quantum_simulator.py`: `@st.cache_data` on `run_quantum_simulation`; vectorize shot sampling
2. `IQ_mixer.py`: remove dead qutip and matplotlib imports
3. Deduplicate `Custom_Qubit_Query.py` / `Qubit_Simulator.py` into shared module
4. Remove auto-simulation on page load; gate behind "Run" button
5. Measure before/after with `time.perf_counter` logged to session state

### C04 — P2/P3 latency fixes + visualization improvements

1. `@st.cache_resource` for sidebar image loading across all pages
2. Fix `Sonify.py` temp file leak; vectorize matrix generation
3. Cache EP/TPD meshgrid; vectorize the 2,000-step loop
4. Replace wildcard import in Quantum_Measurement_Tutorial.py
5. Add `st.progress` to frequency sweep tab
6. Add "Try this scenario in the game →" cross-links from relevant simulator pages (Bridge tier)

### C05 — Game physics improvements

1. QB-3: Fix GATE_INFO tooltip text (Z, Measure descriptions wrong)
2. QB-10: Replace `theta *= 0.55` with `theta *= Math.exp(-1/T1)`, expose T1 as slider
3. QB-11: Trigger Sage async on unit selection (pre-move), not only post-combat

### C06 — Educational completeness (stub pages + glossary)

1. Complete `2_gates_challenge.py` (Gates Challenge — Streamlit page, per contributing guide)
2. Complete `3_gates_challenge.py` (Step Pulse Challenge)
3. QB-12: In-game quantum glossary panel (tap gate name → physics explanation)

---

## 7. Research Connection

David's proposal (`MukuruvaDavid_proposal.tex`) scopes QuBlitz as an interactive TLS physics
platform. For this to work, the game's decoherence model must be physically calibrated:

- **Current:** `theta *= 0.55` — piecewise linear, no physical meaning
- **QB-10 target:** `theta *= Math.exp(-dt/T1)` with T1 drawn from real BCTDS measurements

Once T1 is a tunable parameter in the game, users can import a measured value from the
simulator's Free Play page and watch their qubit decohere at the real rate — closing the loop
between the lab's data and the interactive learning experience.

**Proposal research questions:**
- RQ1: Map BCTDS (ε, Δ, g) parameters to T₂ degradation and gate fidelity
- RQ2: Characterize non-Markovian memory effects (HEOM) in the decoherence model

---

*This document is the reference for all cycle work. The `.cycle/GOALS.md` distills it into
the loop's operational north star. Edit this document freely; edit GOALS.md only through the
gate system.*
