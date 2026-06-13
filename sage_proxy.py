#!/usr/bin/env python3
"""
QuBlitz Sage proxy (QB-9).

A minimal server that holds *your* Anthropic API key server-side and proxies the
in-game Sage advisor, so no user key is ever collected or stored in the browser.
Mirrors Studium's proxy approach: the client POSTs only the game state; this
server adds the system prompt + key and rate-limits per IP.

Run:
    ANTHROPIC_API_KEY=sk-ant-... python3 sage_proxy.py        # serves :58744

Then point the game at it by injecting, before the page loads:
    window.QB_SAGE_PROXY = "http://127.0.0.1:58744/sage";
(e.g. the Streamlit wrapper can do this where a server secret can live.)
"""
from __future__ import annotations

import json
import os
import time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen

HOST = os.environ.get("SAGE_HOST", "127.0.0.1")
PORT = int(os.environ.get("SAGE_PORT", "58744"))
MODEL = os.environ.get("SAGE_MODEL", "claude-haiku-4-5-20251001")
MAX_BODY = 64 * 1024            # game-state payloads are tiny
RATE_LIMIT = 20                 # requests
RATE_WINDOW = 60.0             # per minute, per IP
ALLOW_ORIGIN = os.environ.get("SAGE_ALLOW_ORIGIN", "*")

SYSTEM_PROMPT = (
    "You are the Sage, a cryptic quantum oracle advising a player in QuBlitz — a "
    "tactical battle game where qubit units fight via quantum gates.\n"
    "Gates: H=superposition |+⟩ (50% charge), X=flip to |1⟩ (100% charge), "
    "Z/S/T=relative-phase rotations (matter under an X-basis GUARD), CNOT=Bell-pair "
    "entanglement, MEASURE=collapse & stabilize.\n"
    "Combat (Born rule): charge=P(|1⟩). Attacking fires with probability=charge; a "
    "target caught in |1⟩=CRITICAL (2 dmg), in |0⟩=1 dmg. The attacker discharges "
    "to |0⟩. Entangled units collapse together and share splash via the Bell link. "
    "Decoherence bleeds charge each turn. A GUARDing unit is measured in the X-basis, so "
    "its phase decides the crit (|+⟩ safe, |−⟩ exposed).\n"
    "Give ONE sharp tactical insight in 1-2 short sentences. Use quantum terminology "
    "naturally. Name units by grid coordinate. Be specific, tactical, slightly cryptic. "
    "No lists, no headers, no emoji."
)

_hits: dict[str, deque[float]] = {}


def _rate_ok(ip: str) -> bool:
    now = time.time()
    dq = _hits.setdefault(ip, deque())
    while dq and dq[0] < now - RATE_WINDOW:
        dq.popleft()
    if len(dq) >= RATE_LIMIT:
        return False
    dq.append(now)
    return True


class SageHandler(BaseHTTPRequestHandler):
    def _send(self, code: int, payload: dict):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", ALLOW_ORIGIN)
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):  # CORS preflight
        self._send(204, {})

    def do_POST(self):
        if self.path.rstrip("/") != "/sage":
            self._send(404, {"error": "not found"})
            return
        key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not key:
            self._send(503, {"error": "Sage proxy has no ANTHROPIC_API_KEY configured"})
            return
        ip = self.headers.get("X-Forwarded-For", self.client_address[0]).split(",")[-1].strip()
        if not _rate_ok(ip):
            self._send(429, {"error": "rate limit — try again shortly"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send(400, {"error": "bad length"})
            return
        if length <= 0 or length > MAX_BODY:
            self._send(413, {"error": "payload too large"})
            return
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
            state = str(payload.get("state", ""))[:4000]
        except (json.JSONDecodeError, ValueError):
            self._send(400, {"error": "invalid JSON"})
            return

        upstream = {
            "model": MODEL,
            "max_tokens": 110,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": state}],
        }
        req = Request(
            "https://api.anthropic.com/v1/messages",
            data=json.dumps(upstream).encode(),
            headers={
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read())
        except Exception as exc:  # noqa: BLE001
            self._send(502, {"error": f"upstream error: {type(exc).__name__}"})
            return
        text = ""
        for block in data.get("content", []) or []:
            if block.get("type") == "text":
                text = block.get("text", "")
                break
        self._send(200, {"text": text.strip()})

    def log_message(self, *args):  # quieter logs
        pass


if __name__ == "__main__":
    print(f"QuBlitz Sage proxy on http://{HOST}:{PORT}/sage "
          f"({'key set' if os.environ.get('ANTHROPIC_API_KEY') else 'NO KEY — set ANTHROPIC_API_KEY'})")
    ThreadingHTTPServer((HOST, PORT), SageHandler).serve_forever()
