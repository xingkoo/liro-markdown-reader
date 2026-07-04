#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${1:-/Applications/Liro.app}"

if [[ ! -e "$APP_PATH" ]]; then
  echo "App not found: $APP_PATH" >&2
  exit 1
fi

xattr -dr com.apple.quarantine "$APP_PATH"
echo "Removed macOS quarantine attributes from: $APP_PATH"
