# Cycle 01 Plan — Repo foundations: README, merge to main, fork mvwf/qublitz
*Traces to GOALS.md: "All 10 commits on handoff/qublitz are merged to main and pushed" /
"repo is tagged v1.1.0 with a proper README.md" / "Every PR includes clear commit messages..."*
*Approved: pending gate-1*

## Tasks

### C01-T1 — Write README.md for the Qublitz_Draft game repo
- What: Write `README.md` at the repo root. Sections: (1) one-paragraph "What is QuBlitz",
  (2) screenshot using `screenshots/02_game_board.png`, (3) quick-start (open HTML in browser
  OR `streamlit run app.py`), (4) quantum mechanics primer (Born rule, decoherence T1/T2,
  Bell pairs, X-basis GUARD — short, link to Context Package for depth), (5) Sage AI setup
  (API key via `.env` or Streamlit secrets, or run `sage_proxy.py`), (6) contributing (branch
  naming, CI requirement, PR checklist), (7) research attribution (Fitzpatrick Lab, Dartmouth,
  Unitary Fund if appropriate). Commit message: `docs: add README.md (REPO-1)`.
- Done when: `README.md` exists at repo root; all 7 sections present; screenshot renders on
  GitHub (path relative to repo root resolves); no broken links.
- Fails if: README missing any section, or screenshot 404s on GitHub.
- Risk: none

### C01-T2 — Merge `handoff/qublitz` into `main` and push; tag v1.1.0
- What: `git checkout main && git merge --ff-only handoff/qublitz && git push origin main`.
  Then `git tag v1.1.0 -m "QuBlitz v1.1.0 — all HANDOFF fixes applied" && git push origin v1.1.0`.
  Verify on GitHub that main shows all 10 HANDOFF commits and the tag appears.
- Done when: `git log --oneline origin/main | head -12` shows all HANDOFF commits through QB-8;
  GitHub releases tab shows tag `v1.1.0`.
- Fails if: origin/main still at `e962973` after push, or tag is missing.
- Risk: low — no divergence between branches, pure fast-forward.

### C01-T3 — Fork mvwf/qublitz and set up local clone for contribution work
- What: Fork `mvwf/qublitz` to your GitHub account. Clone the fork locally. Create a branch
  `feature/qublitz-arena` from the fork's main. Confirm `streamlit run Home.py` runs without
  errors in a Python 3.10+ venv with `requirements.txt` installed. Add a remote `upstream`
  pointing to `mvwf/qublitz` for future syncs.
  Commit message on any initial setup commit: `chore: init qublitz-arena contribution branch`.
- Done when: Fork exists on your GitHub; local clone has `feature/qublitz-arena` branch;
  `streamlit run Home.py` starts successfully; `git remote -v` shows both `origin` (fork) and
  `upstream` (mvwf/qublitz).
- Fails if: Streamlit app fails to start (import errors, missing packages), or fork/branch not created.
- Risk: medium — qutip 4.7.6 and librosa may have system dependencies (BLAS, libsndfile).
  Document any workarounds needed.

### C01-T4 — Add QuBlitz Arena stub page to the fork
- What: Create `pages/QuBlitz_Arena.py` in the fork's `feature/qublitz-arena` branch. For this
  cycle, the page is a **stub only**: title, one-paragraph description of the game, and a
  placeholder `st.info("Game loading coming in C02...")`. This verifies the page appears in the
  Streamlit sidebar and sets up the file for C02. Follow the same page structure as existing pages
  (set_page_config at top, main function, `if __name__ == "__main__": main()`).
  Commit message: `feat: add QuBlitz_Arena stub page (QB-arena-1)`.
- Done when: `pages/QuBlitz_Arena.py` exists in the branch; running the app locally shows "QuBlitz
  Arena" in the sidebar; no import errors; page renders the stub content.
- Fails if: Page doesn't appear in sidebar, or causes any import error in the app.
- Risk: low — stub with no imports beyond streamlit.

### C01-T5 — Open PR against mvwf/qublitz with C01 work + CI check
- What: Push `feature/qublitz-arena` to your fork. Open a PR from your fork's
  `feature/qublitz-arena` → `mvwf/qublitz:main`. PR description must include: what this adds
  (QuBlitz Arena page, stub for now), why (integration of game with the simulator platform),
  how to test (run app locally, check sidebar), and a screenshot of the stub page in the sidebar.
  Confirm any CI checks in mvwf/qublitz pass (or note if the repo has no CI).
- Done when: PR is open and visible at github.com/mvwf/qublitz/pulls; PR has a complete
  description; no merge conflicts.
- Fails if: PR can't be opened due to fork config issue, or has merge conflicts with main.
- Risk: low — stub page has no conflicts with existing files.

## Assumptions resolved at gate-1 (confirmed by user 2026-06-13)
- Push access to Qublitz_Draft: CONFIRMED
- Fork + PR approach for mvwf/qublitz: CONFIRMED (public repo)
- Deployment target: Streamlit on qublitz-qubit-lab.streamlit.app, NOT GitHub Pages
- QuBlitz Arena = David's assigned contribution to the main repo

## Will NOT do (this cycle)
- No actual game embed (that is C02 — iframe + Sage proxy wiring)
- No latency fixes to any existing mvwf/qublitz pages (that is C03)
- No game physics changes (QB-3, QB-10, QB-11 are C05)
- No changes to `modern_musician_template/` (parked)
- No session state fixes or caching in any existing page

## Verification plan (audit will run these)
- `git log --oneline origin/main | head -12` in Qublitz_Draft — expected: all HANDOFF commits visible
- `git tag` in Qublitz_Draft — expected: `v1.1.0` present
- `grep -n "QuBlitz\|screenshot\|quick-start\|Born rule\|GUARD\|Sage\|Fitzpatrick" README.md | wc -l` — expected: ≥7 matches (one per section)
- `streamlit run Home.py` on the fork — expected: no import errors, app starts
- `python3 -c "import streamlit; import pages.QuBlitz_Arena"` — expected: no errors
- PR URL accessible on GitHub — expected: PR open, description present, no conflicts
