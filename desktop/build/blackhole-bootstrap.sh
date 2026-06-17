#!/usr/bin/env bash
# TalkPilot macOS: install BlackHole 2ch if missing (admin password via osascript).
set -euo pipefail

BLACKHOLE_VERSION="${BLACKHOLE_VERSION:-0.6.1}"
DOWNLOAD_URL="${BLACKHOLE_PKG_URL:-https://existential.audio/downloads/BlackHole2ch-${BLACKHOLE_VERSION}.pkg}"

test_blackhole_installed() {
  local hal
  for hal in "/Library/Audio/Plug-Ins/HAL" "${HOME}/Library/Audio/Plug-Ins/HAL"; do
    if [[ -d "$hal" ]]; then
      for d in "$hal"/BlackHole*.driver; do
        if [[ -e "$d" ]]; then
          return 0
        fi
      done
    fi
  done
  return 1
}

if test_blackhole_installed; then
  echo "BlackHole already installed."
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG=""
for candidate in \
  "${BLACKHOLE_PKG_PATH:-}" \
  "$SCRIPT_DIR/BlackHole2ch.pkg" \
  "$SCRIPT_DIR/BlackHole2ch-${BLACKHOLE_VERSION}.pkg" \
  "$(dirname "$SCRIPT_DIR")/BlackHole2ch.pkg"; do
  if [[ -n "$candidate" && -f "$candidate" ]]; then
    PKG="$candidate"
    break
  fi
done

TEMP_DIR=""
if [[ -z "$PKG" ]]; then
  TEMP_DIR="$(mktemp -d)"
  PKG="$TEMP_DIR/BlackHole2ch-${BLACKHOLE_VERSION}.pkg"
  echo "Downloading BlackHole from $DOWNLOAD_URL ..."
  if command -v curl >/dev/null 2>&1; then
    curl -fL "$DOWNLOAD_URL" -o "$PKG"
  else
    echo "curl not found; cannot download BlackHole."
    exit 3
  fi
fi

echo "Installing BlackHole (administrator password required)..."
INSTALL_SHELL=$(printf 'installer -pkg %q -target / && (/usr/bin/killall -9 coreaudiod >/dev/null 2>&1 || true)' "$PKG")
/usr/bin/osascript -e "do shell script \"${INSTALL_SHELL}\" with administrator privileges"

if [[ -n "$TEMP_DIR" ]]; then
  rm -rf "$TEMP_DIR"
fi

sleep 1

if test_blackhole_installed; then
  echo "BlackHole installed successfully."
  exit 0
fi

echo "BlackHole installer finished but driver not detected. Reboot may be required."
exit 2
