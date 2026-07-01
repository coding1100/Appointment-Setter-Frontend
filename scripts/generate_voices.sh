#!/usr/bin/env bash
# Windows-friendly voice preview generator (no jq/ffmpeg required).
set -euo pipefail
cd "$(dirname "$0")/.."
python scripts/generate_voice_previews.py "${1:-voices-agent}"
