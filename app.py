"""
QuBlitz — Qubit Battle Arena  |  Streamlit App
==============================================
Run locally:  streamlit run app.py
Deploy:       Push repo to GitHub, connect to share.streamlit.io

NOTE: This Streamlit wrapper embeds the standalone quantum_chess.html game via
st.components.v1.html. The HTML file is fully self-contained (no external assets
beyond Google Fonts) so it deploys cleanly on Streamlit Cloud.
"""

import streamlit as st
from pathlib import Path

# ──────────────────────────────────────────────────────────────
#  PAGE CONFIG  (must be first Streamlit call)
# ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="QuBlitz — Qubit Battle Arena",
    page_icon="◈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ──────────────────────────────────────────────────────────────
#  CUSTOM CSS — dark, neon-glow "living pixel world" theme
# ──────────────────────────────────────────────────────────────
st.markdown("""
<style>
/* BE-4(d) — unlike quantum_chess.html (FE-5 self-hosted its fonts as a
   hard constraint: it must open standalone with zero network deps), this
   Streamlit wrapper page is never opened as a bare file — Streamlit itself
   already requires a server/network round-trip, so a CDN font fetch adds
   no new failure mode. Accepting the dependency rather than duplicating
   FE-5's ~35KB base64 font blob a second time into this file for a title
   and a handful of sidebar headers: an offline classroom still gets a
   correctly-sized page, just in the browser's default sans-serif/monospace
   fallback instead of the pixel/display faces — graceful degradation, not
   the broken-layout failure mode FE-5 was fixing in the game itself.
*/
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Grotesk:wght@400;500;600;700&display=swap');

html, body, [class*="css"], [data-testid="stAppViewContainer"] {
    background:
        radial-gradient(1200px 800px at 15% -10%, #16203f 0%, transparent 55%),
        radial-gradient(1100px 900px at 110% 8%, #1c1448 0%, transparent 55%),
        linear-gradient(160deg, #070a16 0%, #0b1024 55%, #070a16 100%) !important;
    background-attachment: fixed !important;
    color: #eaf0ff !important;
    font-family: 'Space Grotesk', system-ui, sans-serif !important;
}

.main .block-container {
    padding-top: 0.5rem;
    max-width: 1200px;
}

[data-testid="stSidebar"] {
    background: rgba(18,24,52,0.66) !important;
    backdrop-filter: blur(16px) saturate(140%);
    border-right: 1px solid rgba(124,140,230,0.20);
}
[data-testid="stSidebar"] * {
    color: #aeb8e6 !important;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 13px !important;
    line-height: 1.7 !important;
}
[data-testid="stSidebar"] h1,
[data-testid="stSidebar"] h2,
[data-testid="stSidebar"] h3 {
    color: #8b7dff !important;
    font-family: 'Press Start 2P', monospace !important;
    font-size: 11px !important;
    letter-spacing: 1px;
}

h1 {
    font-family: 'Press Start 2P', monospace !important;
    color: #8b7dff !important;
    font-size: 18px !important;
    letter-spacing: 3px;
    text-align: center;
}
h2, h3 {
    font-family: 'Press Start 2P', monospace !important;
    color: #2fe0d0 !important;
    font-size: 11px !important;
}

/* BE-4(a) — st.metric's third positional arg is `delta`, which Streamlit
   always renders with a colored up/down arrow inferred from the leading
   character. None of the captions below are a change/delta — they're
   plain descriptive text ("HP + a quantum charge") — but every one still
   rendered a green "↑" in front of it, actively teaching a misreading of
   the UI (a fact about game rules, presented as if it went up). Plain
   cards instead; visually identical to the old stMetric styling below,
   just without a widget that structurally can't NOT show an arrow. */
.qb-stat-card {
    background: rgba(18,24,52,0.55);
    border: 1px solid rgba(124,140,230,0.20);
    border-radius: 14px;
    padding: 12px;
    box-shadow: 0 10px 26px rgba(0,0,0,0.45);
}
.qb-stat-card .qb-stat-label { color: #8b93c4; font-size: 12px; margin-bottom: 4px; }
.qb-stat-card .qb-stat-value { color: #2fe0d0; font-size: 18px; font-weight: 700; margin-bottom: 2px; }
.qb-stat-card .qb-stat-note  { color: #aeb8e6; font-size: 13px; }

[data-testid="stExpander"] {
    border: 1px solid rgba(124,140,230,0.20) !important;
    border-radius: 14px !important;
    background: rgba(18,24,52,0.45) !important;
}

hr { border-color: rgba(124,140,230,0.18) !important; }

a { color: #2fe0d0 !important; }

iframe {
    border: 1px solid rgba(124,140,230,0.24) !important;
    box-shadow: 0 24px 60px rgba(0,0,0,0.55) !important;
    border-radius: 20px;
}
</style>
""", unsafe_allow_html=True)


# ──────────────────────────────────────────────────────────────
#  LOAD GAME HTML
# ──────────────────────────────────────────────────────────────
GAME_HTML_PATH = Path(__file__).parent / "quantum_chess.html"

# Cache keyed on the file's mtime so editing quantum_chess.html during dev
# serves fresh content instead of a stale cached copy (HY-1).
@st.cache_data(show_spinner=False)
def load_game_html(_mtime: float) -> str:
    if not GAME_HTML_PATH.exists():
        return (
            "<p style='color:#ff5a72;font-family:monospace;padding:20px'>"
            "⚠ quantum_chess.html not found — place it next to app.py and restart.</p>"
        )
    return GAME_HTML_PATH.read_text(encoding="utf-8")


def _game_html_mtime() -> float:
    try:
        return GAME_HTML_PATH.stat().st_mtime
    except OSError:
        return 0.0


GAME_HTML = load_game_html(_game_html_mtime())


# ──────────────────────────────────────────────────────────────
#  SIDEBAR — quantum reference panel
# ──────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("◈ QuBlitz")
    st.markdown("**Qubit Battle Arena**")
    st.divider()

    st.markdown("### 🎮 HOW TO PLAY")
    st.markdown("""
1. Click **▶ PLAY vs BOT** or **▶ PLAY vs FRIEND**.
2. Each side commands an army of **qubit units** (HP + a quantum
   charge). Click one of yours to see its **move** range.
3. Move next to an enemy, then **Attack** — or first **charge**
   the unit toward |1⟩ so the strike lands.
4. **Attacks are measurements:** hit chance = the attacker's
   |1⟩ amplitude (Born rule). |1⟩ = sure hit, |+⟩ = 50% gamble,
   |0⟩ = can't strike. After firing, the unit drops to |0⟩.
5. **Charge bleeds away each turn** (T1 relaxation) — strike soon.
   Keep idle units in |0⟩ so they aren't caught exposed.
6. **Eliminate the enemy army** to win.
    """)
    st.divider()

    # BE-5 — this sidebar used to carry its own copy of every gate
    # description, the combat-odds table, and 7 quantum-concept blurbs —
    # the same material verbatim in the in-game TOME (openTutorial() in
    # quantum_chess.html), plus a third copy on the fork's Arena page. Three
    # hand-edited copies of the same rules WILL drift (the council's own
    # audit already found MEASURE's description differing in nuance across
    # copies). The proper fix — one data source generating all three — is
    # BL-4, a two-repo build-step redesign, explicitly not started here;
    # this is the cheap interim move: keep only the one description that
    # doesn't duplicate anything (the 6-step how-to-play above), delete the
    # per-gate/per-concept expanders, and point at the in-game TOME as the
    # single authoritative reference instead.
    st.markdown("### 📖 FULL REFERENCE")
    st.caption(
        "Gate-by-gate effects, the combat/decoherence math, and every quantum "
        "concept used here live in the game's own **▸ TOME** button (top of "
        "the game panel) — one glossary, always in sync with what you're "
        "actually playing."
    )

    st.divider()
    st.caption("Built with ❤ + quantum weirdness")
    st.caption("Open `quantum_chess.html` for the standalone version.")


# ──────────────────────────────────────────────────────────────
#  MAIN AREA — game embed
# ──────────────────────────────────────────────────────────────
st.markdown("<h1>◈ &nbsp; Q U B L I T Z &nbsp; ◈</h1>", unsafe_allow_html=True)
# BE-4(c) — FE-6's rule ("pixel font is a headline voice, not a body font,
# floor 12px when it is one") applies to this wrapper page too; this was an
# 8px Press Start 2P subtitle, the exact violation FE-6 was written to
# remove from quantum_chess.html. It's prose, not a heading, so body font
# at the paragraph tier instead of just bumping the pixel size to 12px.
st.markdown(
    "<p style='text-align:center;font-size:14px;color:#8b93c4;margin-bottom:10px'>"
    "Qubit Battle Arena — command qubits, learn quantum control through play</p>",
    unsafe_allow_html=True,
)

# BE-4(a) — plain cards, not st.metric (see the .qb-stat-card CSS note above).
QUICK_REFERENCE = [
    ("Armies", "qubit units",       "HP + a quantum charge"),
    ("Combat", "Charge & Measure",  "hit chance = |β|² (Born rule)"),
    ("Win",    "Elimination",       "destroy the enemy army"),
    ("Modes",  "Bot / 2P",          "3 boards · Easy/Med/Hard"),
]
for col, (label, value, note) in zip(st.columns(4), QUICK_REFERENCE):
    col.markdown(
        f'<div class="qb-stat-card">'
        f'<div class="qb-stat-label">{label}</div>'
        f'<div class="qb-stat-value">{value}</div>'
        f'<div class="qb-stat-note">{note}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

st.divider()

# ── GAME EMBED ───────────────────────────────────────────────
# BE-4(b) — named constant instead of a bare literal: this repo's embed was
# a bare `height=1100` while the fork's pages/QuBlitz_Arena.py already has
# its own named `_EMBED_HEIGHT = 920` — the two have already drifted, and a
# magic number here couldn't even be discovered as the thing to reconcile.
# Derivation: title(48) + ui(820, sage overlaid on canvas) + log(68) +
# padding ≈ 960, rounded up for browser-chrome slop. NOT reconciled with
# the fork's 920 here — HANDOFF.md's BE-4 explicitly defers that until FE-10
# (board-first desktop layout) lands and gives both surfaces a real,
# shared number to converge on instead of two independent guesses.
#
# The Sage advisor is the offline heuristic only — no LLM proxy, no Anthropic
# key, no third-party API call anywhere in this deployment.
QB_EMBED_HEIGHT = 1100
st.components.v1.html(GAME_HTML, height=QB_EMBED_HEIGHT, scrolling=True)

st.divider()

# ──────────────────────────────────────────────────────────────
#  QUANTUM PRIMER — expandable deep-dives below the game
# ──────────────────────────────────────────────────────────────
st.markdown("### 📖 Quantum Primer")
st.caption("Expand any section for a deeper explanation of the concepts used in QuBlitz.")

with st.expander("🔵 What is a qubit?", expanded=False):
    st.markdown(r"""
A **qubit** is the quantum analogue of a classical bit. While a classical bit is strictly 0 or 1,
a qubit can be in a **superposition** of both:

$$|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$$

where α and β are complex amplitudes satisfying **|α|² + |β|² = 1**.

- |α|² = probability of measuring 0
- |β|² = probability of measuring 1

In QuBlitz, every unit on the battlefield **is** one of these qubits. Its **charge** — the |1⟩
amplitude |β|² — is both its weapon and its weakness.
    """)

with st.expander("🌀 The Bloch Sphere & Charge", expanded=False):
    st.markdown(r"""
Any pure qubit state maps to a point on a **unit sphere** — the Bloch sphere:

$$|\psi\rangle = \cos\frac{\theta}{2}|0\rangle + e^{i\varphi}\sin\frac{\theta}{2}|1\rangle$$

- **North pole = |0⟩** — ground state: safe, uncharged, can't strike.
- **South pole = |1⟩** — fully charged: a guaranteed strike, but exposed.
- **Equator = superposition** (|+⟩) — a 50/50 gamble.

Charging a unit means rotating its Bloch vector **down toward |1⟩** with control pulses.
    """)

with st.expander("⚔ Combat: Charge & Measure", expanded=False):
    st.markdown(r"""
To attack you must be **adjacent** to an enemy. The strike is a **projective measurement** of your
own unit (the Born rule):

$$P(\text{hit}) = |\beta|^2 = \text{your charge}$$

- **|1⟩ (charge 1.0)** → the strike always fires — but you collapse to |0⟩ and are left exposed.
- **|+⟩ (charge 0.5)** → a coin-flip gamble.
- **|0⟩ (charge 0)** → you can't strike; charge up first.

When a strike fires, the **target is measured too** — if it's caught in |1⟩ it takes a
**critical (2 dmg)**, otherwise 1. So keep idle units near |0⟩.
    """)

with st.expander("⚛ Control Pulses (Quantum Gates)", expanded=False):
    st.markdown(r"""
Every action is a **unitary** rotation of a qubit's state — a control pulse, exactly as on real hardware.

| Pulse | Matrix | Use in battle |
|---|---|---|
| **X** | `[[0,1],[1,0]]` | |0⟩↔|1⟩ — full charge, guaranteed strike |
| **H** | `1/√2 [[1,1],[1,-1]]` | |0⟩→|+⟩ — ~50% charge, a gamble |
| **S** | `[[1,0],[0,i]]` | 90° about Z — relative phase (matters under an X-basis GUARD) |
| **T** | `[[1,0],[0,e^{iπ/4}]]` | 45° about Z — relative phase (matters under an X-basis GUARD) |
| **Z** | `[[1,0],[0,-1]]` | 180° about Z — phase flip |0⟩↔... |+⟩↔|−⟩ |

Gates are *reversible* and preserve |α|²+|β|² = 1.
    """)

with st.expander("💔 Decoherence — T1 Relaxation", expanded=False):
    st.markdown(r"""
Real quantum computers fight a constant battle against **decoherence**. QuBlitz models **T1 relaxation**:

each turn every unit loses a little coherence and its Bloch vector **decays back toward |0⟩** — so a
unit's **charge bleeds away** if you don't use it.

**Consequence:** load up and strike **soon**; don't charge a unit that can't reach a target this turn.
A unit that fully relaxes drops to ground state with its charge lost. Tune the rate in the menu.
    """)

with st.expander("🔗 Entanglement & CNOT", expanded=False):
    st.markdown(r"""
The **CNOT** gate links two **adjacent** units into a Bell state:

$$|\Phi^+\rangle = \frac{1}{\sqrt{2}}(|00\rangle + |11\rangle)$$

In QuBlitz, entangled units are joined by an animated beam, and a **hit on one bleeds 1 damage onto
its partner**. Entangle two adjacent **enemies** to splash damage across both — but beware linking your
own units, since they'll share the harm too.
    """)

with st.expander("🔍 Measurement as a Tool", expanded=False):
    st.markdown(r"""
Observing a qubit **collapses** it to |0⟩ or |1⟩ with probabilities |α|² and |β|² (the Born rule).

In QuBlitz, **Measure** collapses one of your units to an eigenstate and restores coherence (+12).
Use it defensively: **discharge** a unit that's dangerously charged next to an enemy (so it can't be
crit), or **stabilize** a unit whose coherence is running low before you re-charge it.
    """)
