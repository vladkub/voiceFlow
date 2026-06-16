!include "LogicLib.nsh"

/** Закрыть запущенный TalkPilot до обновления — иначе NSIS не удаляет старые файлы (код 2). */
!macro customInit
  DetailPrint "Closing running Voice Translator instances..."
  nsExec::ExecToLog 'taskkill /F /IM "Voice Translator.exe" /T'
  Pop $0
  Sleep 1500
!macroend

!macro customInstall
  DetailPrint "Checking VB-Cable installation..."
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\vbcable-bootstrap.ps1"'
  Pop $0
  ${If} $0 != 0
    DetailPrint "VB-Cable bootstrap exited with code $0 (continuing installer)."
  ${EndIf}
!macroend
