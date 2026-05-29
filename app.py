"""
QuBlitz — Quantum Chess  |  Streamlit App
==========================================
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
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

html, body, [class*="css"] {
    background-color: #050510 !important;
    color: #e0e0ff !important;
}

.main .block-container {
    padding-top: 0.5rem;
    max-width: 1200px;
}

[data-testid="stSidebar"] {
    background-color: #0a0a20 !important;
    border-right: 2px solid #1a1e58;
}
[data-testid="stSidebar"] * {
    color: #aaaaee !important;
    font-family: 'Press Start 2P', monospace;
    font-size: 9px !important;
    line-height: 2.1 !important;
}
[data-testid="stSidebar"] h1,
[data-testid="stSidebar"] h2,
[data-testid="stSidebar"] h3 {
    color: #ffdd44 !important;
    font-size: 8px !important;
    text-shadow: 0 0 8px #ffdd4466;
}

h1 {
    font-family: 'Press Start 2P', monospace !important;
    color: #00e5ff !important;
    font-size: 16px !important;
    letter-spacing: 3px;
    text-shadow: 0 0 18px #00e5ff88, 0 0 40px #7c4dff44;
    text-align: center;
}
h2, h3 {
    font-family: 'Press Start 2P', monospace !important;
    color: #00e676 !important;
    font-size: 9px !important;
}

[data-testid="stMetric"] {
    background: #0a0a20;
    border: 1px solid #1a1e58;
    border-radius: 2px;
    padding: 8px;
}
[data-testid="stMetricLabel"] { color: #484e78 !important; font-size: 8px !important; }
[data-testid="stMetricValue"] { color: #00e676 !important; font-size: 13px !important; }

[data-testid="stExpander"] {
    border: 1px solid #1a1e58 !important;
    background: #0a0a20 !important;
}

hr { border-color: #1a1e58 !important; }

iframe {
    border: 2px solid #343898 !important;
    box-shadow: 0 0 32px #1a1aff44, 0 0 64px #0000ff18 !important;
    border-radius: 2px;
}

/* Scanline overlay */
body::after {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
        0deg, transparent, transparent 2px, #00000012 2px, #00000012 4px
    );
    z-index: 9999;
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
            "<p style='color:#ff1744;font-family:monospace;padding:20px'>"
            "⚠ quantum_chess.html not found — place it next to app.py and restart.</p>"
        )
    return GAME_HTML_PATH.read_text(encoding="utf-8")


GAME_HTML = load_game_html()


# ──────────────────────────────────────────────────────────────
#  SIDEBAR — quantum reference panel
# ──────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("⚛ QuBlitz")
    st.markdown("**Quantum Chess**")
    st.divider()

    st.markdown("### 🎮 HOW TO PLAY")
    st.markdown("""
1. Click **▶ PLAY vs BOT** or **▶ PLAY vs FRIEND**.
2. Click a piece to select, then click a destination.
3. **Green dot** = move · **Red border** = capture · **Dashed purple** = tunnel.
4. After moving, pick a **quantum gate** — or SKIP.
5. Keyboard: `H/X/Y/Z/S/T` apply gates · `M` measure · `Space` skip · `Esc` cancel.
6. Protect your **King** qubit from decoherence and check!
    """)
    st.divider()

    st.markdown("### ⚛ GATE GLOSSARY")
    gates = {
        "H  (Hadamard)":   "Creates superposition |0⟩ → (|0⟩+|1⟩)/√2. π rotation around (X+Z)/√2 axis.",
        "X  (Pauli-X)":    "Bit-flip |0⟩↔|1⟩. π rotation around X-axis. Quantum NOT.",
        "Y  (Pauli-Y)":    "Bit-flip + phase-flip. π rotation around Y-axis. α↦−iβ, β↦iα.",
        "Z  (Pauli-Z)":    "Phase-flip |1⟩→−|1⟩. π rotation around Z-axis. King's anchor.",
        "S  Gate":         "π/2 phase shift on |1⟩. 90° Z-rotation. S²=Z.",
        "T  Gate":         "π/4 phase shift on |1⟩. Non-Clifford. T⁴=Z. Universal QC.",
        "Rx(π/4)":         "Larmor precession — X-axis rotation. Enables tunneling at high coherence.",
        "Ry(π/4)":         "Rabi oscillation — Y-axis rotation. Cleanest coherent qubit drive.",
        "CNOT":            "Entangles two qubits: flips target if control |1⟩. Creates Bell states.",
        "MEASURE":         "Collapses |ψ⟩ to |0⟩ or |1⟩ (Born rule). Restores coherence +10.",
    }
    for name, desc in gates.items():
        with st.expander(name, expanded=False):
            st.caption(desc)

    st.divider()

    st.markdown("### 🧩 PIECE → QUBIT ROLES")
    piece_table = r"""
| Piece | Qubit Role | Start State | Best Gates |
|---|---|---|---|
| ♔ King | Logical qubit | \|0⟩ | Z, S |
| ♕ Queen | Superposition | \|+⟩ | H, Y |
| ♖ Rook | Comp. qubit | \|0⟩ | X, Z |
| ♗ Bishop | Phase qubit | Partial | T, S |
| ♘ Knight | Tunneling | Precessing | Ry, Rx |
| ♙ Pawn | Ground qubit | \|0⟩ | X, H |
"""
    st.markdown(piece_table)

    st.divider()

    st.markdown("### 💡 QUANTUM CONCEPTS")
    concepts = {
        "Superposition":
            "A qubit exists in a blend of |0⟩ and |1⟩ simultaneously "
            "until measured. The Queen starts here: |+⟩=(|0⟩+|1⟩)/√2.",
        "Decoherence (T2)":
            "Environmental noise destroys phase coherence, collapsing superposition. "
            "When coherence < 10 while in superposition, the qubit collapses randomly.",
        "T1 Relaxation":
            "An excited qubit |1⟩ with zero coherence undergoes spontaneous emission "
            "and is removed from the board — modelling energy dissipation in real qubits.",
        "Entanglement":
            "CNOT links two qubits into a Bell state. Measuring one instantly "
            "determines the other — regardless of board distance.",
        "Quantum Tunneling":
            "A Knight with >60% coherence can jump 3 squares through classically "
            "forbidden barriers — modelling quantum barrier penetration.",
        "Measurement":
            "Observing a qubit collapses it to |0⟩ or |1⟩ with probabilities "
            "|α|² and |β|² (Born rule). Destroys superposition; restores coherence +10.",
        "Bloch Sphere":
            "Any pure qubit state maps to a point on a unit sphere. "
            "θ = polar angle (|0⟩/|1⟩ mix), φ = azimuthal angle (phase).",
        "Check & Checkmate":
            "If your King is attacked you must escape (illegal moves are blocked). "
            "No legal escape = checkmate. No legal moves without check = stalemate.",
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
st.markdown("<h1>⚛ &nbsp; Q U B L I T Z &nbsp; ⚛</h1>", unsafe_allow_html=True)
st.markdown(
    "<p style='text-align:center;font-family:\"Press Start 2P\",monospace;"
    "font-size:8px;color:#484e78;margin-bottom:10px'>"
    "Quantum Chess — learn quantum computing through play</p>",
    unsafe_allow_html=True,
)

# Quick-reference metrics row
col1, col2, col3, col4 = st.columns(4)
col1.metric("Qubits",    "32 pieces",    "each with |ψ⟩ = α|0⟩ + β|1⟩")
col2.metric("Gates",     "10 types",     "H X Y Z S T Rx Ry CNOT M")
col3.metric("Mechanics", "Check + Deco", "T1/T2 relaxation + tunneling")
col4.metric("Modes",     "Bot / 2P",     "Easy · Medium · Hard AI")

st.divider()

# ── GAME EMBED ───────────────────────────────────────────────
# Height: title(42) + game UI (660) + log(82) + kb-hint(22) + padding ≈ 880
st.components.v1.html(GAME_HTML, height=900, scrolling=False)

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

In QuBlitz, every piece carries one of these states. The coloured dot above each piece shows whether
it's in ground state (green), superposition (cyan), or excited state (red).
    """)

with st.expander("🌀 The Bloch Sphere", expanded=False):
    st.markdown(r"""
Any pure qubit state maps to a point on a **unit sphere** — the Bloch sphere:

$$|\psi\rangle = \cos\frac{\theta}{2}|0\rangle + e^{i\varphi}\sin\frac{\theta}{2}|1\rangle$$

- **θ** (polar angle): 0° = north pole = |0⟩, 180° = south pole = |1⟩
- **φ** (azimuthal angle): the *phase* — visible in interference, not in Z-basis measurement

Quantum gates rotate the state vector on this sphere.
The Bloch sphere panel in the game shows your selected piece's exact state in real time.
    """)

with st.expander("⚛ Quantum Gates as Chess Moves", expanded=False):
    st.markdown(r"""
After every move in QuBlitz you apply a **quantum gate** — a unitary transformation of your piece's qubit state.

| Gate | Matrix | Effect on Bloch sphere |
|---|---|---|
| **H** | `1/√2 [[1,1],[1,-1]]` | Rotation 180° around (X+Z)/√2 — equator |
| **X** | `[[0,1],[1,0]]` | Flip north↔south (|0⟩↔|1⟩) |
| **Z** | `[[1,0],[0,-1]]` | Flip phase: 180° around Z |
| **S** | `[[1,0],[0,i]]` | Rotate 90° around Z |
| **T** | `[[1,0],[0,e^{iπ/4}]]` | Rotate 45° around Z (non-Clifford) |

Gates are *reversible* and *unitary* — they preserve the total probability |α|²+|β|²=1.
    """)

with st.expander("💔 Decoherence — T1 & T2 Relaxation", expanded=False):
    st.markdown(r"""
Real quantum computers fight a constant battle against **decoherence**:

**T2 (phase decoherence / dephasing):**
Environmental noise destroys the *relative phase* between |0⟩ and |1⟩ components.
When coherence < 10 while a piece is in superposition, it collapses to |0⟩ or |1⟩ randomly.

**T1 (energy relaxation / spontaneous emission):**
An excited qubit |1⟩ with zero remaining coherence dissipates its energy to the environment
and is **removed from the board** — modelling T1 relaxation in superconducting qubits or NV centres.

**Strategy:** Keep your King in |0⟩ ground state (Z/S gates only). Use Measure to stabilise
critical pieces near decoherence — it resets the qubit to a known eigenstate and restores coherence +10.
    """)

with st.expander("🔗 Entanglement & CNOT", expanded=False):
    st.markdown(r"""
The **CNOT (Controlled-NOT)** gate operates on two qubits:

- **Control qubit**: if |1⟩, the target qubit is flipped (X applied).
- When the control is in *superposition*, the result is an **entangled Bell state**:

$$|\Phi^+\rangle = \frac{1}{\sqrt{2}}(|00\rangle + |11\rangle)$$

In QuBlitz, entangled pieces are shown with:
- A dashed pink ring on each piece
- An animated pink beam connecting the two pieces on the board

When the control piece moves, the target's quantum state updates via the CNOT relationship.
Use entanglement to create defensive networks — bind a Rook to your King!
    """)

with st.expander("⚠ Check, Checkmate & Stalemate", expanded=False):
    st.markdown("""
QuBlitz implements full chess legality — moves that leave your King in check are **blocked**.

- **Check**: your King is currently attacked by an enemy piece. The King square pulses red.
  You must make a move that resolves the check (move King, block, or capture the attacker).
- **Checkmate**: you are in check and have no legal moves. Game over — you lose.
- **Stalemate**: you have no legal moves but are NOT in check. This is a draw.

The quantum twist: a King can also be lost via T1 decoherence (excited |1⟩ with zero coherence),
or via direct capture — making check/checkmate one of three ways to end the game.
    """)

with st.expander("🐴 Quantum Tunneling", expanded=False):
    st.markdown(r"""
**Quantum tunneling** allows a particle to cross a potential barrier it classically couldn't cross.
The probability decays exponentially with barrier width but is never exactly zero.

In QuBlitz, a **Knight** with coherence > 60% gains a *tunnel move* — jumping 3 squares in a
straight line, bypassing any intervening pieces. This models finite wavefunction amplitude on the
far side of a classically forbidden region.

**Cost:** 15 coherence per tunnel. Dashed purple squares show available tunnel destinations.
The Knight's Ry/Rx gates (Rabi oscillation / Larmor precession) maintain the off-axis Bloch
vector orientation needed for tunneling to remain available.
    """)
