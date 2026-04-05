#!/bin/zsh
set -euo pipefail
OUT_DIR="$(cd "$(dirname "$0")/../.." && pwd)/data/mission-control"
OUT_FILE="$OUT_DIR/cron.json"
mkdir -p "$OUT_DIR"
if command -v openclaw >/dev/null 2>&1; then
  openclaw cron list --json > "$OUT_FILE"
  echo "Saved cron snapshot to $OUT_FILE"
else
  echo "openclaw CLI not available in this shell" >&2
  exit 1
fi
