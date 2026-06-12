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

[data-testid="stMetric"] {
    background: rgba(18,24,52,0.55);
    border: 1px solid rgba(124,140,230,0.20);
    border-radius: 14px;
    padding: 12px;
    box-shadow: 0 10px 26px rgba(0,0,0,0.45);
}
[data-testid="stMetricLabel"] { color: #8b93c4 !important; font-size: 12px !important; }
[data-testid="stMetricValue"] { color: #2fe0d0 !important; font-size: 18px !important; }

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

@st.cache_data(show_spinner=False)
def load_game_html() -> str:
    if not GAME_HTML_PATH.exists():
        return (
            "<p style='color:#ff5a72;font-family:monospace;padding:20px'>"
            "⚠ quantum_chess.html not found — place it next to app.py and restart.</p>"
        )
    return GAME_HTML_PATH.read_text(encoding="utf-8")


GAME_HTML = load_game_html()


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

    st.markdown("### ⚛ ACTIONS & PULSES")
    gates = {
        "ATTACK":      "Strike an adjacent enemy. Hit chance = your charge |β|². On a hit, an enemy caught in |1⟩ takes a CRITICAL (2 dmg). You then discharge to |0⟩.",
        "X  (charge)": "|0⟩→|1⟩ — full charge, a guaranteed next strike.",
        "H  (gamble)": "|0⟩→|+⟩ — ~50% charge. A flexible coin-flip strike.",
        "S / T":       "Relative-phase rotations about Z (90° / 45°). They don't change charge or a normal strike — but a phase-loaded GUARD interferes in the X-basis, where phase decides the crit.",
        "Z  (Pauli-Z)":"180° about Z — phase flip (|+⟩↔|−⟩). Flips a safe X-basis GUARD into an exposed one.",
        "Y  (Pauli-Y)":"π about Y — bit-flip + phase-flip.",
        "Rx / Ry":     "±45° rotations — partial charge in a single pulse.",
        "CNOT":        "Entangle two ADJACENT units (friend or foe). A hit on one bleeds 1 onto the other.",
        "MEASURE":     "Collapse this unit to an eigenstate and restore coherence (+12). Discharge an exposed unit, or stabilize one.",
    }
    for name, desc in gates.items():
        with st.expander(name, expanded=False):
            st.caption(desc)

    st.divider()

    st.markdown("### ⚔ COMBAT — CHARGE & MEASURE")
    combat_table = r"""
| Your charge | Attacking |
|---|---|
| \|1⟩ (100%) | sure hit — but you're left exposed |
| \|+⟩ (≈50%) | coin-flip gamble |
| \|0⟩ (0%) | cannot strike — charge first |

A hit on an enemy caught in **\|1⟩** is a **CRITICAL (2 dmg)**.
Entangled targets bleed **1** onto their Bell partner.
"""
    st.markdown(combat_table)

    st.divider()

    st.markdown("### 💡 QUANTUM CONCEPTS")
    concepts = {
        "Qubit Control":
            "Steering a qubit's state with control pulses (gates) is the daily work "
            "of real quantum hardware. Here it's how you arm and defend your units.",
        "Charge = Born Rule":
            "A unit's charge is P(|1⟩) = |β|². Attacking measures it: the strike "
            "fires with that probability — exactly the Born rule.",
        "Bloch Sphere":
            "Any pure qubit state is a point on a unit sphere. The north pole is "
            "|0⟩ (safe), the south pole |1⟩ (full charge). Gates rotate the vector.",
        "Superposition":
            "|+⟩ on the equator is a 50/50 blend — a gamble both when you attack "
            "and when you're attacked (caught at 50% to take a critical).",
        "Decoherence (T1)":
            "Each turn a unit relaxes toward |0⟩ and loses coherence — charge bleeds "
            "away. Load up and strike soon; a fully relaxed unit drops to ground state.",
        "Entanglement":
            "CNOT links two adjacent units into a Bell state; a hit on one bleeds "
            "onto its partner. Entangle two enemies for splash damage.",
        "Measurement":
            "Projective collapse to |0⟩ or |1⟩ (Born rule). Discharges/stabilizes a "
            "unit and restores coherence — a defensive reset.",
    }
    for term, explanation in concepts.items():
        with st.expander(term, expanded=False):
            st.caption(explanation)

    st.divider()
    st.caption("Built with ❤ + quantum weirdness")
    st.caption("Open `quantum_chess.html` for the standalone version.")


# ──────────────────────────────────────────────────────────────
#  MAIN AREA — game embed
# ──────────────────────────────────────────────────────────────
st.markdown("<h1>◈ &nbsp; Q U B L I T Z &nbsp; ◈</h1>", unsafe_allow_html=True)
st.markdown(
    "<p style='text-align:center;font-family:\"Press Start 2P\",monospace;"
    "font-size:8px;color:#8b93c4;margin-bottom:10px'>"
    "Qubit Battle Arena — command qubits, learn quantum control through play</p>",
    unsafe_allow_html=True,
)

# Quick-reference metrics row
col1, col2, col3, col4 = st.columns(4)
col1.metric("Armies",  "qubit units",      "HP + a quantum charge")
col2.metric("Combat",  "Charge & Measure", "hit chance = |β|² (Born rule)")
col3.metric("Win",     "Elimination",      "destroy the enemy army")
col4.metric("Modes",   "Bot / 2P",         "3 boards · Easy/Med/Hard")

st.divider()

# ── GAME EMBED ───────────────────────────────────────────────
# Height: title(48) + ui(820, sage overlaid on canvas) + log(68) + padding ≈ 960
st.components.v1.html(GAME_HTML, height=960, scrolling=False)

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
