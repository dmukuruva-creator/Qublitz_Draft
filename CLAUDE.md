# QuBlitz — Claude Code Handoff

This project is running under the **project-cycle-loop** skill. Read `.cycle/STATE.md` first —
it tells you exactly where the loop is and what to do next. Do not start any work until you
have read STATE.md, GOALS.md, and the current cycle's PLAN.md.

## Current state

Live cycle/phase/gate status lives in `.cycle/STATE.md` — read it first, every session. This
file is intentionally not kept in sync with it and must not be treated as a status source (a
stale duplicate here caused confusion before). The active, task-level plan is `HANDOFF.md`; its
superseded predecessor is preserved verbatim at `docs/HANDOFF_v1_ARCHIVE_2026-07-02.md`.

## Repo layout — two repos in play

| What | Local path | Remote |
|---|---|---|
| The game (Qublitz_Draft) | This folder (`QuBlitz Project/`) | https://github.com/dmukuruva-creator/Qublitz_Draft |
| Main simulator (mvwf/qublitz) | Clone separately after forking | https://github.com/mvwf/qublitz |

**Game repo branch situation:**
- Currently on `handoff/qublitz` — this is the branch with all 10 HANDOFF improvements applied
- `origin/main` is 10 commits behind — C01-T2 merges `handoff/qublitz` → `main` and pushes
- Do not push directly from `handoff/qublitz`; merge to `main` first (fast-forward)

## Gate-1 assumptions already confirmed by the user

- Push access to `dmukuruva-creator/Qublitz_Draft`: YES
- Fork + PR approach for `mvwf/qublitz`: YES (public repo, fork to your account)
- Deployment: Streamlit on `qublitz-qubit-lab.streamlit.app` — NOT GitHub Pages
- QuBlitz Arena is David's assigned contribution page in the main repo
- Scope includes latency + visualization improvements across all existing mvwf/qublitz pages

## Git / PR hygiene requirements (from GOALS.md)

Every commit must follow: `scope: imperative description (ticket-id)`
Examples:
- `docs: add README.md (REPO-1)`
- `feat: add QuBlitz_Arena stub page (QB-arena-1)`
- `chore: merge handoff/qublitz to main and tag v1.1.0`

Every PR against mvwf/qublitz must include:
- What changed and why
- How to test locally
- Screenshot of any UI change

## Key files to read before starting

- `.cycle/GOALS.md` — the north star (never edit this)
- `.cycle/STATE.md` — current cycle/phase/gate status (read every session)
- `HANDOFF.md` — the active, task-level remediation plan
- `.cycle/cycles/cycle-01/PLAN.md` — the approved Gate-1 plan (historical)
- `docs/Project_Description_ARCHIVE_2026-06.md` — original project scoping + latency audit
  (historical; superseded by `.cycle/GOALS.md` and `HANDOFF.md`)

## Environment notes

- Game runs standalone: open `quantum_chess.html` in Chrome
- Game runs via Streamlit: `streamlit run app.py` (requires `pip install streamlit`)
- Physics tests: `node tests/qphysics.test.js` (requires Node 20+)
- Sage proxy: `ANTHROPIC_API_KEY=sk-ant-... python3 sage_proxy.py`
- mvwf/qublitz requires Python 3.10+, venv recommended; `pip install -r requirements.txt`
  (qutip 4.7.6 needs BLAS; on macOS: `brew install openblas` if needed)
