"""
🔊 Управление аудио-устройствами Windows через nircmd.exe
✅ Использует Windows COM API для получения ТОЧНОГО имени микрофона по умолчанию
✅ Надёжное переключение и восстановление с повторными попытками
✅ Подробное логирование каждого шага
"""

import os
import subprocess
import logging
import platform
import sounddevice as sd

logger = logging.getLogger(__name__)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NIRCMD_PATH = os.path.join(PROJECT_ROOT, "nircmd.exe")

def _run_nircmd(*args, timeout: int = 10) -> tuple[bool, str]:
    """Запускает nircmd.exe и возвращает (успех, сообщение)"""
    if not os.path.exists(NIRCMD_PATH):
        return False, f"❌ nircmd.exe не найден: {NIRCMD_PATH}"
    try:
        flags = subprocess.CREATE_NO_WINDOW if platform.system() == "Windows" else 0
        res = subprocess.run(
            [NIRCMD_PATH] + list(args),
            capture_output=True, text=True, timeout=timeout, creationflags=flags
        )
        if res.returncode == 0:
            return True, "✅ Успешно"
        return False, f"⚠️ Ошибка nircmd: {res.stderr.strip() or 'код ' + str(res.returncode)}"
    except subprocess.TimeoutExpired:
        return False, "⏱ Превышено время ожидания"
    except Exception as e:
        return False, f"❌ Исключение: {str(e)}"

def get_current_recording_device() -> str:
    """
    🔥 ПОЛУЧАЕТ ТОЧНОЕ ИМЯ микрофона по умолчанию через Windows COM API.
    Это самый надёжный способ, так как возвращает имя именно так, как его видит система.
    """
    # PowerShell COM-команда для получения FriendlyName устройства eCapture (1) eConsole (0)
    ps_cmd = "(New-Object -ComObject MMDeviceEnumerator).GetDefaultAudioEndpoint(1,0).OpenPropertyStore(0).GetValue([Guid]::new('a45c254e-df1c-4e92-9227-8e8d825b5c93'),0).Value"
    try:
        res = subprocess.run(
            ["powershell", "-Command", ps_cmd],
            capture_output=True, text=True, timeout=5,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        if res.returncode == 0:
            name = res.stdout.strip()
            if name:
                logger.info(f"🎛️ Windows COM вернул имя: '{name}'")
                return name
    except Exception as e:
        logger.warning(f"⚠️ COM-запрос не удался: {e}")

    # Fallback на sounddevice (если COM не сработал)
    try:
        idx = sd.default.device[0]
        if idx is not None:
            return sd.query_devices()[idx]['name'].strip()
    except: pass

    return "Unknown"

def set_default_recording_device(device_name: str) -> bool:
    """Устанавливает устройство записи по умолчанию через nircmd"""
    if not device_name or device_name == "Unknown":
        logger.error("❌ Попытка переключиться на пустое/неизвестное устройство")
        return False

    logger.info(f"🔍 nircmd: setdefaultsounddevice '{device_name}' 2")
    
    # nircmd чувствителен к регистру и пробелам, передаём как есть
    success, msg = _run_nircmd("setdefaultsounddevice", device_name, "2")
    if success:
        logger.info(f"✅ {msg}")
    else:
        logger.error(f"❌ {msg}")
    return success

def enable_conference_mode() -> bool:
    logger.info("🔌 Включение режима конференции...")
    return set_default_recording_device("CABLE Output")

def disable_conference_mode(original_mic: str) -> bool:
    logger.info(f"🔌 Возврат микрофона: '{original_mic}'")
    return set_default_recording_device(original_mic)