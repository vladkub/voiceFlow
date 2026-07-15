#!/bin/bash
# TalkPilot — установка с сайта (двойной клик или: bash Install-TalkPilot-Mac.command)
# Скачивает DMG, ставит в Программы, снимает блокировку Gatekeeper, запускает.
set -euo pipefail

APP_NAME="Voice Translator.app"
DEST="/Applications/${APP_NAME}"
DMG_URL="https://talkpilot.pro/downloads/Voice-Translator.dmg"
TMP_DIR="$(mktemp -d /tmp/talkpilot-install-XXXXXX)"
DMG_PATH="${TMP_DIR}/Voice-Translator.dmg"
MOUNT_DIR=""

cleanup() {
  if [[ -n "${MOUNT_DIR}" ]]; then
    hdiutil detach "${MOUNT_DIR}" -quiet 2>/dev/null || true
  fi
  # detach by volume name if needed
  hdiutil detach "/Volumes/Voice Translator" -quiet 2>/dev/null || true
  for vol in /Volumes/Voice*; do
    if [[ -d "${vol}/${APP_NAME}" ]]; then
      hdiutil detach "${vol}" -quiet 2>/dev/null || true
    fi
  done
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

osascript <<'EOF' || true
display dialog "TalkPilot скачает установщик (~100 МБ), поставит приложение в «Программы» и снимет блокировку macOS.
Нужен интернет." buttons {"Продолжить"} default button 1 with title "Установка TalkPilot"
EOF

echo "Downloading TalkPilot..."
curl -fL --retry 3 -o "${DMG_PATH}" "${DMG_URL}?t=$(date +%s)"

echo "Mounting DMG..."
ATTACH_OUT="$(hdiutil attach "${DMG_PATH}" -nobrowse -readonly)"
MOUNT_DIR="$(printf '%s\n' "${ATTACH_OUT}" | awk '/\/Volumes\// {print $NF; exit}')"
if [[ -z "${MOUNT_DIR}" || ! -d "${MOUNT_DIR}" ]]; then
  # fallback: find mounted app
  for vol in /Volumes/*; do
    if [[ -d "${vol}/${APP_NAME}" ]]; then
      MOUNT_DIR="${vol}"
      break
    fi
  done
fi

SRC="${MOUNT_DIR}/${APP_NAME}"
if [[ ! -d "${SRC}" ]]; then
  osascript <<'EOF' || true
display dialog "Не удалось открыть образ диска TalkPilot. Скачайте DMG вручную с talkpilot.pro и запустите «Install TalkPilot» внутри образа." buttons {"OK"} default button 1 with icon stop
EOF
  exit 1
fi

killall "Voice Translator" 2>/dev/null || true
rm -rf "${DEST}"
ditto "${SRC}" "${DEST}"
xattr -cr "${DEST}" || true

open "${DEST}"

osascript <<'EOF' || true
display notification "TalkPilot установлен и запускается" with title "TalkPilot"
EOF

echo "Done."
exit 0
