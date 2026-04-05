#!/bin/zsh
set -euo pipefail
MC_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DATA_FILE="$MC_DIR/data/mission-control/tasks.json"
EDITOR_APP="code"

echo "Mission Control task sync helper"
echo "Current data file: $DATA_FILE"
if [ ! -f "$DATA_FILE" ]; then
  echo "No tasks.json found" >&2
  exit 1
fi
${EDITOR_APP:-nano} "$DATA_FILE"
