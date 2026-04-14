"""
QuBlitz — Quantum Chess  |  Streamlit App
==========================================
Run locally:  streamlit run app.py
Deploy:       Push repo to GitHub, connect to share.streamlit.io
"""

import streamlit as st
from pathlib import Path

# ──────────────────────────────────────────────────────────────
#  PAGE CONFIG  (must be first Streamlit call)
# ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="QuBlitz — Quantum Chess",
    page_icon="⚛",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ──────────────────────────────────────────────────────────────
#  CUSTOM CSS — dark retro theme matching the game
# ──────────────────────────────────────────────────────────────
st.markdown("""
<style>
/* Pull in the retro pixel font */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

html, body, [class*="css"] {
    background-color: #0a0a1a !important;
    color: #e0e0ff !important;
}

/* Main container */
.main .block-container {
    padding-top: 1rem;
    max-width: 1200px;
}

/* Sidebar */
[data-testid="stSidebar"] {
    background-color: #0d0d2e !important;
    border-right: 2px solid #2222aa;
}
[data-testid="stSidebar"] * {
    color: #aaaaee !important;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px !important;
    line-height: 2 !important;
}
[data-testid="stSidebar"] h1,
[data-testid="stSidebar"] h2,
[data-testid="stSidebar"] h3 {
    color: #ffdd44 !important;
    font-size: 9px !important;
}

/* Page title */
h1 {
    font-family: 'Press Start 2P', monospace !important;
    color: #ffdd44 !important;
    font-size: 18px !important;
    letter-spacing: 2px;
    text-shadow: 0 0 18px #ffdd4488;
    text-align: center;
}
h2, h3 {
    font-family: 'Press Start 2P', monospace !important;
    color: #44ffaa !important;
    font-size: 10px !important;
}

/* Metric boxes */
[data-testid="stMetric"] {
    background: #10103a;
    border: 1px solid #2222aa;
    border-radius: 4px;
    padding: 8px;
}
[data-testid="stMetricLabel"] { color: #6688cc !important; font-size: 9px !important; }
[data-testid="stMetricValue"] { color: #44ffaa !important; font-size: 14px !important; }

/* Expander */
[data-testid="stExpander"] {
    border: 1px solid #2222aa !important;
    background: #0d0d2e !important;
}

/* Divider */
hr { border-color: #2222aa !important; }

/* Scanline overlay on the whole page */
body::after {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
        0deg, transparent, transparent 2px, #00000014 2px, #00000014 4px
    );
    z-index: 9999;
}

/* iframe (game embed) */
iframe {
    border: 3px solid #4444aa !important;
    box-shadow: 0 0 32px #2222aa88 !important;
    border-radius: 4px;
}
</style>
""", unsafe_allow_html=True)


# ──────────────────────────────────────────────────────────────
#  LOAD GAME HTML
# ──────────────────────────────────────────────────────────────
GAME_HTML_PATH = Path(__file__).parent / "quantum_chess.html"

@st.cache_data(show_spinner=False)
def load_game_html() -> str:
    """Load and return the game HTML. Cached so it's read only once."""
    if not GAME_HTML_PATH.exists():
        return "<p style='color:red;font-family:monospace'>quantum_chess.html not found next to app.py</p>"
    return GAME_HTML_PATH.read_text(encoding="utf-8")


GAME_HTML = load_game_html()


# ──────────────────────────────────────────────────────────────
#  SIDEBAR — quantum concepts reference
# ──────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("⚛ QuBlitz")
    st.markdown("**Quantum Chess**")
    st.divider()

    st.markdown("### 🎮 HOW TO PLAY")
    st.markdown("""
1. Click **▶ PLAY vs BOT** or **▶ PLAY vs FRIEND** in the game menu.
2. Click any of your pieces to select it.
3. Click a green dot to **move**, red border to **capture**, dashed purple to **tunnel**.
4. After moving, choose a **quantum gate** from the popup — or SKIP.
5. Protect your **King** qubit from decoherence!
    """)
    st.divider()

    st.markdown("### ⚛ GATE GLOSSARY")

    gates = {
        "H  (Hadamard)":  "Creates superposition |0⟩ → (|0⟩+|1⟩)/√2",
        "X  (Pauli-X)":   "Bit-flip  |0⟩ ↔ |1⟩",
        "Z  (Pauli-Z)":   "Phase-flip |1⟩ → −|1⟩",
        "S  Gate":        "π/2 phase shift on |1⟩",
        "T  Gate":        "π/4 phase shift on |1⟩",
        "Y  (Pauli-Y)":   "Bit + phase flip",
        "Rx(θ)":          "Rotation around X-axis (Larmor precession)",
        "Ry(θ)":          "Rotation around Y-axis (Rabi oscillation)",
        "CNOT":           "Entangles two qubits; flips target if control = |1⟩",
        "MEASURE":        "Collapse qubit to |0⟩ or |1⟩ (Born rule)",
    }
    for name, desc in gates.items():
        with st.expander(name, expanded=False):
            st.caption(desc)

    st.divider()

    st.markdown("### 🧩 PIECE → QUBIT")

    piece_table = """
| Piece | Qubit Role | Start State |
|---|---|---|
| ♔ King | Logical qubit | \|0⟩ |
| ♕ Queen | Superposition master | \|+⟩ |
| ♖ Rook | Bit-flip qubit | \|0⟩ |
| ♗ Bishop | Phase qubit | Partial excitation |
| ♘ Knight | Tunneling qubit | Precessing |
| ♙ Pawn | Fresh qubit | \|0⟩ |
"""
    st.markdown(piece_table)

    st.divider()

    st.markdown("### 💡 QUANTUM CONCEPTS")
    concepts = {
        "Superposition":
            "A qubit can exist in a blend of |0⟩ and |1⟩ simultaneously "
            "until measured. The Queen starts here.",
        "Decoherence":
            "Interaction with the environment destroys superposition, "
            "collapsing the qubit. All pieces lose coherence each turn.",
        "Entanglement":
            "CNOT links two qubits so measuring one instantly determines "
            "the other — regardless of distance.",
        "Quantum Tunneling":
            "A Knight with >60% coherence can 'tunnel' 3 squares, "
            "bypassing classical barriers.",
        "Measurement":
            "Observing a qubit collapses it to |0⟩ or |1⟩ with "
            "probabilities |α|² and |β|² (Born rule).",
        "Bloch Sphere":
            "Any pure qubit state is a point on a unit sphere. "
            "θ sets the |0⟩/|1⟩ mix; φ sets the phase.",
        "Excitation":
            "Applying X (or Ry/Rx rotations) drives a qubit from "
            "ground |0⟩ toward excited |1⟩ — like a two-level atom.",
        "Phase":
            "S and T gates rotate the qubit around the Z-axis of "
            "the Bloch sphere — invisible without interference.",
    }
    for term, explanation in concepts.items():
        with st.expander(term, expanded=False):
            st.caption(explanation)

    st.divider()
    st.caption("Built with ❤ + quantum weirdness")
    st.caption("Open `quantum_chess.html` for the standalone version.")


# ──────────────────────────────────────────────────────────────
#  MAIN AREA — title + game embed
# ──────────────────────────────────────────────────────────────
st.markdown("<h1>⚛ &nbsp; Q U B L I T Z &nbsp; ⚛</h1>", unsafe_allow_html=True)
st.markdown(
    "<p style='text-align:center;font-family:\"Press Start 2P\",monospace;"
    "font-size:9px;color:#6688cc;margin-bottom:12px'>"
    "Quantum Chess — learn quantum computing through play</p>",
    unsafe_allow_html=True,
)

# Quick-reference metrics row
col1, col2, col3, col4 = st.columns(4)
col1.metric("Pieces",    "32 qubits",   "each with |ψ⟩ state")
col2.metric("Gates",     "9 types",     "H X Y Z S T Rx Ry CNOT")
col3.metric("Mechanics", "Decoherence", "& tunneling")
col4.metric("Modes",     "vs Bot / 2P", "adjustable deco rate")

st.divider()

# ── GAME EMBED ──────────────────────────────────────────────
# Height is canvas (640) + HUD rows + log bar + some padding
st.components.v1.html(GAME_HTML, height=820, scrolling=False)

st.divider()

# ──────────────────────────────────────────────────────────────
#  QUANTUM PRIMER — expandable deep-dives below the game
# ──────────────────────────────────────────────────────────────
st.markdown("### 📖 Quantum Primer")
st.caption("Expand any section for a deeper explanation of the concepts used in QuBlitz.")

with st.expander("🔵 What is a qubit?", expanded=False):
    st.markdown("""
A **qubit** is the quantum analogue of a classical bit. While a classical bit is strictly 0 or 1,
a qubit can be in a **superposition** of both:

$$|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$$

where α and β are complex amplitudes satisfying **|α|² + |β|² = 1**.

- |α|² = probability of measuring 0
- |β|² = probability of measuring 1

In QuBlitz, every piece carries one of these states. The coloured dot above each piece shows whether
it's in ground state (green), superposition (cyan), or excited state (red).
    """)

with st.expander("🌀 The Bloch Sphere", expanded=False):
    st.markdown("""
Any pure qubit state can be visualised as a point on a **unit sphere** — the Bloch sphere:

$$|\\psi\\rangle = \\cos\\frac{\\theta}{2}|0\\rangle + e^{i\\varphi}\\sin\\frac{\\theta}{2}|1\\rangle$$

- **θ** (polar angle): 0° = north pole = |0⟩, 180° = south pole = |1⟩
- **φ** (azimuthal angle): the *phase* — not visible in measurement probabilities alone

Quantum gates rotate the state vector on this sphere.
The mini Bloch sphere in the right panel shows your selected piece's exact state in real time.
    """)

with st.expander("⚛ Quantum Gates as Chess Moves", expanded=False):
    st.markdown("""
After every move in QuBlitz you apply a **quantum gate** — a unitary transformation of your piece's qubit state.

| Gate | Matrix | Effect on Bloch sphere |
|---|---|---|
| **H** | `1/√2 [[1,1],[1,-1]]` | Rotation 180° around X+Z axis |
| **X** | `[[0,1],[1,0]]` | Flip north↔south (|0⟩↔|1⟩) |
| **Z** | `[[1,0],[0,-1]]` | Flip phase (rotation 180° around Z) |
| **S** | `[[1,0],[0,i]]` | Rotate 90° around Z |
| **T** | `[[1,0],[0,e^{iπ/4}]]` | Rotate 45° around Z |

Gates are *reversible* and *unitary* — they preserve the total probability.
    """)

with st.expander("💔 Decoherence & the Arrow of Time", expanded=False):
    st.markdown("""
Real quantum computers fight a constant battle against **decoherence** — unwanted interaction
between qubits and their environment that destroys superposition.

In QuBlitz, every piece loses coherence each turn (simulating environmental noise, T₂ relaxation).
When coherence → 0:

1. A piece in superposition **collapses** randomly to |0⟩ or |1⟩ (like a measurement you didn't choose).
2. If it collapses to |1⟩ (excited state) with no coherence left, it **decays** and is removed —
   modelling spontaneous emission / T₁ relaxation in real qubits.

**Strategy tip:** Use S and Z gates on your King to keep it in a stable phase eigenstate, slowing apparent decoherence.
    """)

with st.expander("🔗 Entanglement & CNOT", expanded=False):
    st.markdown("""
The **CNOT (Controlled-NOT)** gate acts on two qubits:

- **Control qubit**: if |1⟩, the target is flipped (X applied).
- **Target qubit**: flipped or not depending on the control.

When the control is in *superposition*, the result is an **entangled Bell state**:

$$|\\Phi^+\\rangle = \\frac{1}{\\sqrt{2}}(|00\\rangle + |11\\rangle)$$

In QuBlitz, entangled pieces (shown with a dashed ring) are quantum-linked:
moving one instantly updates the other via the CNOT relationship.
Use this to create defensive networks around your King!
    """)

with st.expander("🐴 Quantum Tunneling (Knight)", expanded=False):
    st.markdown("""
**Quantum tunneling** lets a particle pass through a potential barrier it classically shouldn't be able to cross.
The probability decays exponentially with barrier width, but it's never exactly zero.

In QuBlitz, a **Knight** with coherence > 60% gains a *tunnel move* — it can jump 3 squares
(instead of the usual L-shape), representing tunneling through the lattice.
Each tunnel costs 15 coherence (the tunneling probability cost) and is shown as a dashed purple square.
    """)
