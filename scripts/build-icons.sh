#!/usr/bin/env bash
set -euo pipefail
SRC="electron/assets/icon.png"
if [ ! -f "$SRC" ]; then
  echo "Place a 1024x1024 PNG at $SRC"
  exit 1
fi
if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick 'convert' not found. Install it to generate extra icon sizes."
  exit 1
fi
convert "$SRC" -resize 256x256 "electron/assets/icon-256.png"
echo "Generated electron/assets/icon-256.png"

