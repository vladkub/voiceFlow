#!/bin/bash
# TalkPilot — простая установка без сертификата Apple.
# Двойной клик в окне DMG: копирует приложение, снимает карантин Gatekeeper, запускает.
set -euo pipefail

APP_NAME="Voice Translator.app"
DEST="/Applications/${APP_NAME}"

cd "$(dirname "$0")"
SRC=""
if [[ -d "./${APP_NAME}" ]]; then
  SRC="$(pwd)/${APP_NAME}"
else
  for vol in /Volumes/*; do
    if [[ -d "${vol}/${APP_NAME}" ]]; then
      SRC="${vol}/${APP_NAME}"
      break
    fi
  done
fi

if [[ -z "${SRC}" || ! -d "${SRC}" ]]; then
  osascript <<'EOF' || true
display dialog "Не найден файл Voice Translator.app рядом с установщиком. Откройте Voice-Translator.dmg и снова запустите «Install TalkPilot»." buttons {"OK"} default button 1 with icon stop
EOF
  exit 1
fi

osascript <<EOF || true
display dialog "TalkPilot будет установлен в папку «Программы».
macOS может спросить разрешение — нажмите «Открыть» / «Разрешить»." buttons {"Установить"} default button 1 with title "Установка TalkPilot"
EOF

killall "Voice Translator" 2>/dev/null || true
rm -rf "${DEST}"
ditto "${SRC}" "${DEST}"
xattr -cr "${DEST}" || true
xattr -cr "${DEST}/Contents" 2>/dev/null || true

open "${DEST}"

osascript <<'EOF' || true
display notification "TalkPilot установлен и запускается" with title "TalkPilot"
EOF

exit 0
