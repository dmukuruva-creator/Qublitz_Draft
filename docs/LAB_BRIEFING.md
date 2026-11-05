# QuBlitz Platform — Suggested Improvements
### Briefing for the PI & website maintainer · prepared by David Mukuruva · 2026-07-07

*Context: the QuBlitz Arena page is now merged and live at
[qublitz-qubit-lab.streamlit.app](https://qublitz-qubit-lab.streamlit.app). Having worked
inside the codebase to ship it, I did a careful pass over the rest of the platform and put
together the suggestions below. Observations are from the live site plus the fork codebase as of
today — please sanity-check anything against what you see live, since you know the deployment
better than I do. **Nothing here is a criticism of the science, which is the platform's real
strength. These are front-door, consistency, speed, and one security item — and for anything that
touches the lab's public identity, I'm asking permission, not proposing to just do it.***

---

## The bottom line (30 seconds)

The physics on this platform is genuinely excellent and rare — real open-quantum-systems
simulations (qutip, Lindblad solvers), real lab instruments modeled (dilution fridge, IQ mixer,
laser heating). The gap is that the **presentation doesn't yet advertise how good the science
is**, and a few pages are slow enough that a student may think they're broken. I'd like to help
close that gap, in small reviewable pieces, within the "latency and visualization improvements"
scope we already agreed. There is also **one time-sensitive security caution** about the AI
advisor that I'd want your decision on before it's ever switched on for a live audience.

Four themes, in priority order:

1. **The front door** — the landing page undersells the platform.
2. **Consistency** — pages don't share a look, a title, or a header.
3. **Speed & reliability** — several pages recompute everything on every slider move.
4. **The AI advisor ("Sage") — a security/cost caution before it goes live.**

---

## What's working and worth protecting

I want to be clear about what I would *not* touch:

- The **physics engines** are rigorous and, in the game's case, unit-tested. That's the credibility asset.
- The **breadth** of tools (simulator, measurement tutorial, noise explorer, laser heating, IQ mixing, EP/TPD, sonification, and now the game) is unusual for an education site.
- The **Arena game** now embeds cleanly and ships with a working offline advisor out of the box.

Every suggestion below is meant to make that existing work *look* as strong as it *is*.

---

## 1. The front door (landing page)

**What a first-time student sees today:** two logos, a large link that leads *away* from the site
(the FitzLab website), the text "Welcome to Qublitz!", and then ten page links in a plain list
with no descriptions. A student sent here by a professor can't tell which tool they were meant to
open, and the browser tab shows a generic title.

**Why it matters:** I tested the "professor said go play with qublitz before lab" path. Without
descriptions or a suggested starting point, the natural student reaction is to give up and ask for
the exact page URL — which defeats the point of a landing page.

**What I'd suggest:**
- A one-line statement of what the platform *is* ("Simulate real quantum hardware in your browser — the same physics our lab runs, no install").
- One plain-English sentence under each tool, naming the actual physics ("sweep a qubit's drive and watch the Rabi chevron"), not generic filler.
- Group the tools (e.g. *Learn / Play / Research tools*) and add a "new here? start with the Qubit Simulator" pointer.
- One clear note on the **Custom Qubit Query** page: it needs the lab VPN and currently just hangs silently for public visitors — a single warning line fixes that.

**Effort:** ~1 day. It's a single-file change. **This one touches the lab's public identity, so
I'd bring you a mock-up first and only ship it if you like it.**

---

## 2. Consistency across pages

**What I found:** there's no shared "page shell." Only 5 of the 10 pages set a browser-tab title;
each page hand-rolls its own header; there's no site-wide theme file — so the physics pages render
in stock light-mode Streamlit while the Arena game is dark neon, which feels like two different
websites.

**What I'd suggest:** a tiny shared helper every page calls for its title, icon, and header (about
40 lines, applied once), plus an optional site theme so the pages share a visual identity. I'd
build the helper as an obvious win; **the theme/colors I'd only propose — that's the lab's brand,
your call.**

**Effort:** ~1 day for the shared helper across all pages; theme is a separate, optional proposal.

---

## 3. Speed & reliability

**What I measured:** four of the heaviest pages (the dilution-fridge noise explorer, laser heating
calculator, measurement tutorial, and EP/TPD explorer) re-run their *entire* computation on every
single slider or widget change — Streamlit reruns the whole script each time. On the free hosting
tier (which also sleeps and cold-starts slowly), that means a student dragging a slider watches the
page freeze for seconds and reasonably concludes it's broken.

**What I'd suggest** (all standard Streamlit patterns, no physics changes):
- Add "Run" buttons / input forms so compute happens on submit, not on every twitch.
- Cache the expensive solves so repeated views are instant.
- Trim the app's cold-start weight by loading heavy libraries only on the pages that use them.
- **Important safeguard:** before caching any physics computation, I'd add a small regression check that the cached output is bit-for-bit identical to the original — a caching bug that silently returned *wrong* physics would be the worst possible outcome for a teaching tool, so I want a guard against it.
- I'd bring **before/after timing numbers** so the improvement is measured, not asserted.

**Effort:** ~1.5–2 days across the four pages. This sits squarely inside the "latency
improvements" scope we agreed, so I can start here with the least back-and-forth.

---

## 4. The AI advisor ("Sage") — one security caution before it goes live

**The situation, stated plainly and accurately:** the game ships with a *safe offline* advisor by
default, so **nothing is at risk on the live site today.** The live AI advisor only activates if a
server-side proxy (holding a paid Anthropic API key) is deployed and pointed at the game.

**The caution:** the proxy in its current form is **not safe to expose publicly.** As written it
would accept requests from any website, its rate limit can be trivially bypassed, and it has no
spending cap — so if it were deployed as-is and the URL got shared or crawled, the API bill could
be run up quickly. **Please do not deploy the live Sage until this is hardened.**

**What I'd suggest:**
- I'll harden the proxy (lock down who can call it, a real rate limit, a hard daily spending ceiling, run it over HTTPS) and write a short deploy guide — as its own separate change.
- **Two things that are yours and take minutes:** set a spending cap in the Anthropic console (a safety net regardless of anything I do), and treat the current API key as one to rotate before any public deploy.
- One policy question for you: the live advisor sends the student's game state to a third-party API (Anthropic). For classroom use with students, that likely wants a consent/FERPA look before a pilot.

**I would *not* add AI to the physics pages** unless you specifically want it — wrong hints in a
teaching tool are a liability that lands on the instructor, so that stays off the table until you ask.

---

## How I'd like to work (so this doesn't feel like a takeover)

This is the lab's repo, and I already have work in review — so I want to be deliberate:

- **Small, separate pull requests**, each doing one thing you can review in a few minutes, with screenshots — not one big redesign.
- **For anything that changes the lab's public identity** (the landing page, a site theme, renaming a page, changing dependencies), I'll open a short GitHub issue with a mock-up and wait for your go-ahead *before* writing the code.
- **The speed/consistency fixes** fall inside our agreed scope, so I can start those right away if you're comfortable.
- I'll bring measured before/after numbers rather than claims.

---

## What I'm asking for in this meeting

| # | Ask | Your decision |
|---|---|---|
| 1 | May I proceed with the **speed/reliability fixes** on the four slow pages (inside our agreed scope)? | Yes / not yet |
| 2 | May I proceed with the **shared page-header helper** (titles + consistent headers)? | Yes / not yet |
| 3 | May I bring you a **landing-page mock-up** and a **theme proposal** for your approval? | Yes / no |
| 4 | Is renaming the longest page title / handling the **VPN-only page** something you want changed? | Your call |
| 5 | **Before any live Sage:** will you set an **Anthropic spending cap** and treat the key as **rotate-before-deploy**? (I'll harden the proxy separately.) | Acknowledge |
| 6 | Do you want a **consent/FERPA review** scoped before a classroom pilot of the live AI advisor? | Yes / defer |

---

## One-line summary to leave them with

> "The science is the strongest part; I'd like to help the front door, consistency, and speed catch
> up to it — in small reviewable pieces, asking first on anything that touches the lab's brand — and
> there's one API-cost safeguard to put in place before the live AI advisor is ever switched on."

---

*Detailed, task-level engineering plan (with file references, effort, and PR packaging) lives in
`../HANDOFF.md` in my working repo — happy to share it if the maintainer wants the implementation
depth. This briefing is the plain-English version for the conversation.*
