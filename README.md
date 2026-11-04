# QuBlitz — Photon Duel

QuBlitz is a real-time quantum laser game with two supported modes: **Photon Duel**, a match against the bot, and **Duel Training**, guided missions using the same mechanics. Each ship carries a qubit: laser pulses rotate its Bloch vector, continuous decoherence changes its state, and measurement samples an outcome using the Born rule.

The self-contained `quantum_chess.html` runs directly in a browser. The filename is retained for compatibility with existing links and platform embeds.

## Quick start

Open `quantum_chess.html` in a desktop browser; no installation or network connection is required for the game. Start with **Duel Training**, then try **Photon Duel**.

For the optional Streamlit wrapper:

```bash
pip install -r requirements.txt
streamlit run app.py
```

Click inside the embedded game before using keyboard controls. The wrapper optionally loads web fonts; the standalone game embeds its assets.

## Controls

The authoritative bindings are `DUEL_CONTROLS` in `quantum_chess.html` and the in-game help.

| Action | Keyboard | Standard gamepad |
|---|---|---|
| Move | WASD | Left stick |
| Aim | Arrow keys or pointer | Right stick |
| Charge attack; release to fire | Shift | Right trigger |
| Charge self-pulse; release to apply | F | Left trigger |
| Select beam | 1 / 2 / 3 | LB / RB or D-pad |
| Measure | Space | A / Cross |
| Entangle | E | X / Square |
| Pause | Esc | Menu |

Rotate the opponent's state toward |1⟩ and watch the live measurement odds before launching a measurement. Training missions introduce the mechanics and their objectives. Progress, winning records and mastery badges are stored locally in the browser when storage is available; they do not sync across devices. Standard gamepad behavior has automated virtual-pad coverage; physical hardware compatibility is not certified.

## Verification

With Node 20+ installed:

```bash
npm ci
npm test
npm run test:duel
npx playwright install chromium
npm run test:input
npm run test:focus
npm run test:mastery-input
npm run contrast
npm run offline
npm run live-check
npm run capture
```

The physics suite checks the underlying quantum engine. The duel suite checks real-time mechanics; browser checks cover input lifecycle, the two-mode hub, training and records, contrast, offline operation and responsive rendering. The duel suite declares a pending Phase Rift composite-rotation case; a green run does not certify that unimplemented feature.

The lab platform is a separate repository. Its Arena page vendors this game's HTML and records its source commit and SHA-256. Use `scripts/sync_vendor.sh` and the platform's vendor-equality check when preparing an integration release; do not independently edit the embedded copy.

## Deprecated board version

The previous turn-based board game is deprecated and no longer a supported mode. Its army controls, board selection and advisor instructions do not apply to this release. Historical source remains in Git history; older design documents and screenshots describe that earlier product unless explicitly updated for Photon Duel. The current HTML contains Photon Duel and Duel Training only.

## Contributing and attribution

Keep mechanics grounded in quantum gates, measurement, decoherence or control imperfections. Include relevant test results and screenshots for UI changes in pull requests. See `HANDOFF.md` for development history and known limitations.

Developed by **David Mukuruva** within the **Fitzpatrick Lab, Dartmouth College**. QuBlitz is the game companion to the lab's [qubit simulator](https://github.com/mvwf/qublitz). The platform can import a fitted simulator T₁ into the duel's relaxation model; this is a scaled teaching connection, not a hardware calibration claim.
