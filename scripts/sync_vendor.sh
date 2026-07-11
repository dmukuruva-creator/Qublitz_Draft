#!/usr/bin/env bash
# BE-7 — the fork's pages/_assets/quantum_chess.html is a hand-synced copy of
# this file (the "golden rule" in HANDOFF.md: edit canonical here first,
# test, then copy). This script IS that copy step — and it writes the exact
# sha256 the fork's CI vendor-check compares against (scripts/check_vendor.sh
# in the fork repo), so "the copy" and "the thing CI verifies" can never
# drift apart from each other the way the golden rule alone already has
# (embed-height, gate-rule text — see HANDOFF.md's BE-5/BE-7 notes).
#
# Usage: scripts/sync_vendor.sh <path-to-qublitz-fork-checkout>
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/quantum_chess.html"
FORK_DIR="${1:?Usage: scripts/sync_vendor.sh <path-to-qublitz-fork-checkout>}"
DEST_DIR="$FORK_DIR/pages/_assets"

if [ ! -f "$SRC" ]; then
  echo "error: $SRC not found" >&2
  exit 1
fi
if [ ! -d "$DEST_DIR" ]; then
  echo "error: $DEST_DIR not found — is $FORK_DIR the qublitz fork checkout?" >&2
  exit 1
fi

cp "$SRC" "$DEST_DIR/quantum_chess.html"
SHA="$(shasum -a 256 "$SRC" | awk '{print $1}')"
echo "$SHA" > "$DEST_DIR/VENDOR_SHA"

echo "Synced $SRC"
echo "   -> $DEST_DIR/quantum_chess.html"
echo "sha256: $SHA"
echo "Wrote $DEST_DIR/VENDOR_SHA — commit both files together in the fork repo."
