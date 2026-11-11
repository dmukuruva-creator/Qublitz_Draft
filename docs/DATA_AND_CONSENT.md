# QuBlitz — Data & Consent Posture

*One page, written down, per the peer-review catch this document exists to close: a teaching
tool used with students needs its data posture stated plainly, not left implicit in code. Nothing
in `quantum_chess.html` should ever contradict what's written here — if it does, that's a bug in
the code, not a footnote to add here.*

## The one-line summary

**QuBlitz makes no automatic network calls of any kind.** Nothing is collected unless a student
explicitly clicks a specific export button, and even then the result is a local file download,
never a submission to any server QuBlitz controls. This is a structural guarantee, not a policy
promise — there is no `fetch`, `XMLHttpRequest`, `sendBeacon`, or `WebSocket` call anywhere in
`quantum_chess.html` (verified by grep across the whole file; `tests/offline_check.js` asserts
this automatically on every run, loading the page with the browser's network fully disabled and
failing the test if anything tries to reach out).

## What the game stores, and where

Everything below lives in the browser's own `localStorage`/`sessionStorage` for the QuBlitz
origin — never sent anywhere, never visible to anyone but whoever has that browser open.

| Key | Storage | Contents | Persists across... |
|---|---|---|---|
| `qublitz_lb` | localStorage | Three numbers: fastest-win turn count, most criticals, most entanglements in a single match | Tabs and browser restarts |
| `qb_coach` | localStorage | "teach" vs "terse" Sage-verbosity preference | Tabs and browser restarts |
| `qb_sage_collapsed` | localStorage | Whether the Sage panel is collapsed | Tabs and browser restarts |
| `qb_hint_actions` | localStorage | A one-time "seen the action hint" flag | Tabs and browser restarts |
| `qb_phone_gate_dismissed` | sessionStorage | Phone-unsupported interstitial dismissal (FE-9) | Until the tab closes |
| `qb_sel_hint_open` | sessionStorage | Whether the Selected Qubit panel's explainer is expanded (FE-13) | Until the tab closes |
| `qb_notation_seen_*` | sessionStorage | Which first-use notation chips (PED-3) have already been shown | Until the tab closes |

**None of this is or contains personally identifying information.** No name, no email, no student
ID, no IP address — the leaderboard entries are anonymous personal-best numbers with no identity
attached. In-memory game state (`GAME.gateCounts`, `GAME.campaignDone`, live board state, and —
if the optional research toggle is on — `GAME.evQuizResults`) is **not persisted at all**: it
resets on every page reload and was never written to storage in the first place.

## What Sage sends, and to whom

**Nothing, to no one.** The live-Claude-Sage proxy path (`sage_proxy.py`, `window.QB_SAGE_PROXY`)
was deleted outright on 2026-07-08 rather than hardened — see `HANDOFF.md`'s Sage-removal ruling.
The in-game Sage advisor (`analyzePosition()`) is a fully offline heuristic: it reads the current
board state already sitting in the browser's own memory and returns a tip, with no API call, no
key, and no third party involved at any point. There is no student data — prompts, board state,
or otherwise — that has ever left the browser via Sage, on any deployment of this game.

## What the telemetry export contains (EV-2)

A student can click **EXPORT MY GATE LOG** (in the main menu) to download a JSON file to their
own device. This is the *only* data-leaves-the-browser path in the entire game, and even then
"leaves the browser" means "gets written to the student's own Downloads folder" — QuBlitz itself
never transmits it anywhere; the student decides afterward whether to hand that file to an
instructor.

Current schema (versioned; see `quantum_chess.html`'s `GATE_LOG_EXPORT_SCHEMA_VERSION`):

```jsonc
{
  "schemaVersion": 2,
  "exportedAt": "2026-07-12T18:30:00.000Z",        // ISO 8601 timestamp, client clock
  "gateLog": { "X": 12, "H": 3, "MEASURE": 2 },     // per-gate counts, THIS session only
  "combat": {
    "hitsLanded": 5, "critCount": 2, "entanglCount": 1,
    "guardAttacksFaced": 3, "guardCritsTaken": 1
  },
  "campaign": {
    "completedIndices": [0, 3],                      // which of the 7 training missions
    "completedTitles": ["MISSION 1 — THE BORN RULE", "..."],
    "totalMissions": 7
  },
  "evQuiz": [                                          // EV-1's optional in-game 3-question
    { "missionIndex": 0, "answeredAt": "...", "answers": [0, 1, 1], "correctCount": 3 }
  ],                                                    // check -- empty if never enabled/answered
  "personalBests": { "fastestWin": 14, "mostCrits": 3, "mostEntangl": 1 }
}
```

No name, no identifier of any kind is in this file unless a student or instructor adds one
themselves after the fact (e.g., renaming the downloaded file). The export button and the
underlying JSON structure are implemented in `quantum_chess.html` (`exportGateLog()` /
`buildGateLogExport()`).

## The rule, stated plainly

**No automatic collection. Export is student-initiated, every time, no exceptions.** If a future
change to this file ever adds a network call, a background upload, or an export that fires
without an explicit click, that change contradicts this document and should be treated as a
regression, not a feature.

## FERPA note for classroom use

Because no student data is transmitted or stored on any server QuBlitz controls, and the optional
export is entirely student-initiated and student-controlled (the student chooses whether and to
whom to send the resulting file), QuBlitz itself does not create an "education record" under
FERPA in the way a school-hosted platform collecting and retaining student data would. That said:
**this is not a substitute for your institution's own FERPA/IRB review** if you plan to use
`docs/EV1_TRANSFER_TEST.md` or the gate-log export for anything beyond a single class's own
in-the-moment teaching use — collecting, aggregating, or retaining student responses for research
purposes is exactly the kind of use `HANDOFF.md`'s own human-actions list flags as needing IRB
consultation first (see EV-4, the pilot study — explicitly not attempted in this codebase; the
instrument exists, the pilot itself is a human/institutional decision, not a code one).

## Known limitations, stated honestly

- `localStorage`/`sessionStorage` are per-browser, per-device — a student switching computers or
  clearing browser data loses their leaderboard/preference state. This is expected, not a bug.
- The gate-log export has no built-in de-duplication or aggregation across multiple sessions —
  each export is a snapshot of the current in-memory session only. An instructor collecting
  multiple exports from the same student across a term would need to handle that aggregation
  themselves.
- This document describes `quantum_chess.html`'s own behavior. The Streamlit fork
  (`mvwf/qublitz`, `pages/QuBlitz_Arena.py`) that embeds this game does not add any additional
  data collection on top of it — see that repo's own docstrings — but this document is not a
  substitute for reviewing the fork's own posture if it changes independently.