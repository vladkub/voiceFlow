# -*- coding: utf-8 -*-
"""
🎙️ Voice Cloner Module — Coqui XTTS Zero-Shot Cloning
✅ Клонирование голоса по образцу (6-30 секунд)
✅ Поддержка русского и английского языков
✅ Лимит 10 голосов на пользователя
✅ Изоляция голосов по user_id
✅ Сохранение на диск между перезапусками
"""

import os, sys, asyncio, tempfile, hashlib, json, time
from pathlib import Path
from typing import Optional, List, Dict
import numpy as np

# 🔥 Ленивая загрузка TTS (singleton)
_tts_model = None

def get_tts_model(model_name: str = "tts_models/multilingual/multi-dataset/xtts_v2"):
    """Получает или загружает модель XTTS"""
    global _tts_model
    if _tts_model is None:
        print(f"🎙️ Загрузка модели XTTS: {model_name}...", flush=True)
        try:
            from TTS.api import TTS as TTSClas
            _tts_model = TTSClas(model_name=model_name, progress_bar=False)
            print(f"✅ Модель XTTS загружена и готова", flush=True)
        except ImportError as e:
            print(f"❌ Ошибка импорта TTS: {e}", flush=True)
            raise
        except RuntimeError as e:
            print(f"❌ Ошибка инициализации модели: {e}", flush=True)
            raise
        except Exception as e:
            print(f"❌ Неожиданная ошибка: {type(e).__name__}: {e}", flush=True)
            import traceback
            traceback.print_exc()
            raise
    return _tts_model

def detect_language(text: str) -> str:
    """Определяет язык текста (упрощённо)"""
    if any(ord(c) > 127 and 'а' <= c.lower() <= 'я' for c in text):
        return "ru"
    return "en"

def validate_audio_file(file_path: str, min_duration: float = 3.0, max_duration: float = 30.0) -> Dict:
    """Проверяет корректность аудио-файла для клонирования"""
    try:
        import soundfile as sf
        data, sr = sf.read(file_path)
        if len(data.shape) > 1:
            data = np.mean(data, axis=1)
        duration = len(data) / sr
        
        result = {
            "valid": True,
            "duration": round(duration, 2),
            "sample_rate": sr,
            "channels": 1,
            "warnings": []
        }
        
        if duration < min_duration:
            result["valid"] = False
            result["warnings"].append(f"Слишком коротко: {duration:.1f}с (минимум {min_duration}с)")
        if duration > max_duration:
            result["warnings"].append(f"Длинновато: {duration:.1f}с (рекомендуется до {max_duration}с)")
        if sr < 16000:
            result["warnings"].append(f"Низкая частота дискретизации: {sr}Гц (рекомендуется 22050+ Гц)")
        return result
    except Exception as e:
        return {"valid": False, "error": str(e)}

async def clone_voice(
    text: str,
    speaker_wav: str,
    language: Optional[str] = None,
    speed: float = 1.0,
    output_path: Optional[str] = None
) -> Dict:
    """Генерирует речь клонированным голосом"""
    try:
        validation = validate_audio_file(speaker_wav)
        if not validation["valid"]:
            return {"success": False, "error": f"Некорректный аудио-файл: {validation.get('warnings', validation.get('error', 'Unknown error'))}"}
        
        if language is None:
            language = detect_language(text)
        
        tts = get_tts_model()
        
        if output_path:
            tts.tts_to_file(text=text, speaker_wav=speaker_wav, language=language, file_path=output_path, speed=speed)
            import soundfile as sf
            data, sr = sf.read(output_path)
            return {"success": True, "audio_path": output_path, "duration": round(len(data) / sr, 2), "language": language}
        else:
            from io import BytesIO
            import soundfile as sf
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp_path = tmp.name
            try:
                tts.tts_to_file(text=text, speaker_wav=speaker_wav, language=language, file_path=tmp_path, speed=speed)
                data, sr = sf.read(tmp_path)
                duration = len(data) / sr
                buffer = BytesIO()
                sf.write(buffer, data, sr, format='WAV')
                buffer.seek(0)
                return {"success": True, "audio_data": buffer.read(), "duration": round(duration, 2), "language": language, "sample_rate": sr}
            finally:
                if os.path.exists(tmp_path): os.remove(tmp_path)
    except Exception as e:
        import traceback
        print(f"❌ Voice cloning error: {e}", flush=True)
        traceback.print_exc()
        return {"success": False, "error": f"Ошибка генерации: {str(e)}"}

def list_available_voices(voices_dir: str, user_id: Optional[str] = None) -> List[Dict]:
    """Возвращает список сохранённых клонированных голосов (с логированием)"""
    voices = []
    configs_dir = os.path.join(voices_dir, "configs")
    
    # 🔥 Логирование пути
    print(f"🔍 Сканирую папку голосов: {configs_dir}", flush=True)
    print(f"🔍 user_id фильтр: {user_id}", flush=True)
    
    if not os.path.exists(configs_dir):
        print(f"⚠️ Папка configs не найдена: {configs_dir}", flush=True)
        return voices
    
    files_found = os.listdir(configs_dir)
    print(f"📁 Найдено файлов в configs: {len(files_found)}", flush=True)
    
    for filename in files_found:
        if filename.endswith(".json"):
            config_path = os.path.join(configs_dir, filename)
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    config = json.load(f)
                
                # 🔥 Логирование каждого конфига
                config_user_id = config.get("user_id", "anonymous")
                print(f"   📄 {filename}: user_id={config_user_id}, name={config.get('name')}", flush=True)
                
                # 🔥 Фильтрация по user_id (если указан)
                if user_id and config_user_id != user_id:
                    print(f"      ⏭️ Пропущено (не совпадает user_id)", flush=True)
                    continue
                
                # 🔥 Проверяем, существует ли аудио файл
                sample_path = config.get("sample_path")
                if sample_path and not os.path.exists(sample_path):
                    print(f"      ⚠️ Аудио файл не найден: {sample_path}", flush=True)
                    continue
                
                voices.append({
                    "id": config.get("id", filename.replace(".json", "")),
                    "name": config.get("name", "Без названия"),
                    "user_id": config_user_id,
                    "created_at": config.get("created_at"),
                    "language": config.get("language", "auto"),
                    "sample_duration": config.get("sample_duration"),
                    "sample_path": config.get("sample_path")
                })
                
            except Exception as e:
                print(f"⚠️ Error loading voice config {filename}: {e}", flush=True)
    
    print(f"✅ Загружено {len(voices)} голосов для user_id={user_id}", flush=True)
    return sorted(voices, key=lambda x: x.get("created_at", ""), reverse=True)

def save_voice_config(
    voices_dir: str, 
    voice_id: str, 
    name: str, 
    sample_path: str, 
    language: str = "auto", 
    user_id: Optional[str] = None,
    metadata: Optional[Dict] = None
) -> str:
    """Сохраняет конфигурацию клонированного голоса с привязкой к пользователю"""
    configs_dir = os.path.join(voices_dir, "configs")
    samples_dir = os.path.join(voices_dir, "samples")
    os.makedirs(configs_dir, exist_ok=True)
    os.makedirs(samples_dir, exist_ok=True)
    
    sample_ext = os.path.splitext(sample_path)[1] or ".wav"
    new_sample_path = os.path.join(samples_dir, f"{voice_id}{sample_ext}")
    
    import shutil
    shutil.copy2(sample_path, new_sample_path)
    
    config = {
        "id": voice_id, 
        "name": name, 
        "language": language,
        "user_id": user_id,  # 🔥 Сохраняем user_id!
        "sample_path": new_sample_path,
        "sample_duration": validate_audio_file(new_sample_path).get("duration"),
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "metadata": metadata or {}
    }
    
    config_path = os.path.join(configs_dir, f"{voice_id}.json")
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Голос сохранён: {config_path}", flush=True)
    return config_path

def delete_voice(voices_dir: str, voice_id: str) -> bool:
    """Удаляет клонированный голос и его файлы"""
    configs_dir = os.path.join(voices_dir, "configs")
    samples_dir = os.path.join(voices_dir, "samples")
    success = True
    
    config_path = os.path.join(configs_dir, f"{voice_id}.json")
    if os.path.exists(config_path):
        try:
            os.remove(config_path)
            print(f"🗑️ Удалён конфиг: {config_path}", flush=True)
        except:
            success = False
    
    for ext in [".wav", ".mp3", ".ogg", ".flac"]:
        sample_path = os.path.join(samples_dir, f"{voice_id}{ext}")
        if os.path.exists(sample_path):
            try:
                os.remove(sample_path)
                print(f"🗑️ Удалён аудио файл: {sample_path}", flush=True)
            except:
                success = False
    
    return success

# 🔥 Лимит голосов
def count_voices(voices_dir: str, user_id: Optional[str] = None) -> int:
    """Возвращает количество сохранённых голосов (опционально для пользователя)"""
    configs_dir = os.path.join(voices_dir, "configs")
    if not os.path.exists(configs_dir):
        return 0
    
    count = 0
    for filename in os.listdir(configs_dir):
        if filename.endswith(".json"):
            config_path = os.path.join(configs_dir, filename)
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    config = json.load(f)
                    if user_id is None or config.get("user_id") == user_id:
                        count += 1
            except:
                pass
    
    return count

def get_voice_limit() -> int:
    """Возвращает лимит голосов на пользователя"""
    return 10

if __name__ == "__main__":
    print("🧪 Тест модуля voice_cloner.py", flush=True)
    try:
        model = get_tts_model()
        print("✅ Модель загружена успешно", flush=True)
    except Exception as e:
        print(f"❌ Ошибка: {e}", flush=True)
        sys.exit(1)
    print("✅ Все проверки пройдены", flush=True)