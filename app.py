"""
QuBlitz — Photon Duel  |  Streamlit App
==============================================
Run locally:  streamlit run app.py
Deploy:       Push repo to GitHub, connect to share.streamlit.io

NOTE: This Streamlit wrapper embeds the standalone quantum_chess.html game via
st.components.v1.html. The HTML file is fully self-contained (no external assets) so it deploys cleanly on Streamlit Cloud.
The wrapper optionally loads Google Fonts with system-font fallbacks.
"""

import streamlit as st
from pathlib import Path

# ──────────────────────────────────────────────────────────────
#  PAGE CONFIG  (must be first Streamlit call)
# ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="QuBlitz — Photon Duel",
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


# Controls mirror DUEL_CONTROLS in quantum_chess.html. The in-game help is authoritative.
with st.sidebar:
    st.title("◈ QuBlitz")
    st.markdown("**Photon Duel & Duel Training**")
    st.markdown("### How to play")
    st.markdown("""
1. Choose **Duel Training** for guided missions, or **Photon Duel** for a match against the bot.
2. Click inside the game to focus it. Move with **WASD** and aim with **arrow keys** or the pointer.
3. Select a beam with **1 / 2 / 3**. Hold and release **Shift** to attack or **F** for a self-pulse.
4. Rotate the opponent's qubit toward |1⟩, then press **Space** to launch a measurement.
5. Use **E** to entangle and **Esc** to pause. Follow the mission's objective in training.
    """)
    st.markdown("### Standard gamepad")
    st.caption(
        "Left stick moves; right stick aims. Right trigger charges attack; left trigger "
        "charges a self-pulse. LB/RB or D-pad selects beams. A/Cross measures, "
        "X/Square entangles, and Menu pauses."
    )
    st.caption("See the in-game controls for the current bindings. Physical controller compatibility varies by browser.")
    st.divider()
    st.caption("Open quantum_chess.html directly for the standalone, offline game.")

st.title("QuBlitz — Photon Duel")
st.caption("A real-time laser duel: control quantum states, then choose when to measure.")
st.markdown(
    "**Photon Duel** is the free duel against the bot. **Duel Training** teaches the same "
    "mechanics through guided missions. Records, training progress and mastery badges are "
    "saved in this browser when local storage is available."
)

QB_EMBED_HEIGHT = 1100
st.components.v1.html(GAME_HTML, height=QB_EMBED_HEIGHT, scrolling=True)

with st.expander("The quantum model"):
    st.markdown(
        "Each ship carries a qubit represented by a Bloch vector. Laser pulses rotate its "
        "state; measurement samples an outcome using the Born rule. T₁ relaxation and T₂ "
        "dephasing evolve continuously during play. Read the opponent's live measurement "
        "odds and use training to explore the consequences of each action."
    )
with st.expander("Previous version"):
    st.markdown(
        "The turn-based board game is deprecated and is no longer a supported mode. "
        "Its source remains in Git history. The filename quantum_chess.html is retained "
        "for existing links and embeds; it now contains Photon Duel and Duel Training."
    )
