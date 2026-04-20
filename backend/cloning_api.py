# -*- coding: utf-8 -*-
"""
🎙️ Voice Cloning API Endpoints — с привязкой к пользователю
✅ Каждый пользователь видит только свои голоса
✅ Лимит 10 голосов на пользователя
✅ Удаление голосов
✅ Сохранение на диск между перезапусками
"""

import os, uuid, time, shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List

from . import voice_cloner

router = APIRouter(prefix="/api/clone", tags=["Voice Cloning"])

# 🔥 Абсолютный путь к папке voices
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VOICES_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "voices"))
print(f"📁 VOICES_DIR (абсолютный путь): {VOICES_DIR}", flush=True)

os.makedirs(VOICES_DIR, exist_ok=True)

# 🔥 Вспомогательная функция: получение user_id из заголовка
def get_user_id(x_user_id: Optional[str] = Header(None, alias="X-User-ID")) -> str:
    """Извлекает user_id из заголовка или генерирует анонимный"""
    if x_user_id:
        return x_user_id
    # Для тестов без авторизации — анонимный пользователь
    return "anonymous"

class CloneRequest(BaseModel):
    voice_id: str
    text: str
    language: Optional[str] = None
    speed: float = 1.0

@router.get("/voices")
async def list_voices(x_user_id: Optional[str] = Header(None, alias="X-User-ID")):
    """Список голосов текущего пользователя"""
    user_id = get_user_id(x_user_id)
    
    print(f"🔍 Запрос /api/clone/voices для user_id: '{user_id}'", flush=True)
    print(f"📁 VOICES_DIR: {VOICES_DIR}", flush=True)
    
    # 🔥 Фильтрация по user_id
    voices = voice_cloner.list_available_voices(VOICES_DIR, user_id=user_id)
    
    print(f"✅ Возвращаю {len(voices)} голосов", flush=True)
    
    return {
        "voices": voices, 
        "count": len(voices),
        "user_id": user_id,
        "limit": {"current": len(voices), "max": voice_cloner.get_voice_limit()}
    }

@router.post("/upload-sample")
async def upload_voice_sample(
    file: UploadFile = File(...), 
    name: str = Form(...), 
    language: str = Form("auto"),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """Загрузка образца голоса для клонирования"""
    user_id = get_user_id(x_user_id)
    
    print(f"📤 Загрузка голоса для user_id: {user_id}", flush=True)
    
    # 🔥 Считаем голоса ТОЛЬКО этого пользователя
    user_voices = voice_cloner.list_available_voices(VOICES_DIR, user_id=user_id)
    current_count = len(user_voices)
    max_limit = voice_cloner.get_voice_limit()
    
    if current_count >= max_limit:
        raise HTTPException(400, f"Достигнут лимит голосов: {current_count}/{max_limit}. Удалите старый голос, чтобы добавить новый.")
    
    if not file.filename.lower().endswith(('.wav', '.mp3', '.ogg', '.flac')):
        raise HTTPException(400, "Неподдерживаемый формат. Используйте WAV, MP3, OGG или FLAC")
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(400, "Файл слишком большой (максимум 10 МБ)")
    
    temp_dir = os.path.join(VOICES_DIR, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"temp_{uuid.uuid4().hex}{os.path.splitext(file.filename)[1]}")
    
    try:
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        validation = voice_cloner.validate_audio_file(temp_path)
        print(f"🔍 Валидация аудио: {validation}", flush=True)
        
        if not validation["valid"]:
            os.remove(temp_path)
            raise HTTPException(400, f"Некорректное аудио: {'; '.join(validation.get('warnings', [validation.get('error', 'Unknown error')]))}")
        
        voice_id = str(uuid.uuid4())[:8]
        
        # 🔥 Передаём user_id в save_voice_config
        voice_cloner.save_voice_config(
            voices_dir=VOICES_DIR, 
            voice_id=voice_id, 
            name=name, 
            sample_path=temp_path, 
            language=language, 
            user_id=user_id,  # 🔥 Важно!
            metadata={"original_filename": file.filename}
        )
        
        os.remove(temp_path)
        
        # 🔥 Пересчитываем лимит для этого пользователя
        new_count = voice_cloner.count_voices(VOICES_DIR, user_id=user_id)
        
        return {
            "voice_id": voice_id, 
            "name": name, 
            "language": language, 
            "validation": validation, 
            "message": f"✅ Голос сохранён! ({new_count}/{max_limit})", 
            "limit": {"current": new_count, "max": max_limit},
            "user_id": user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        print(f"❌ Upload error: {e}", flush=True)
        raise HTTPException(500, f"Ошибка обработки: {str(e)}")

@router.post("/generate")
async def generate_with_cloned_voice(req: CloneRequest, x_user_id: Optional[str] = Header(None, alias="X-User-ID")):
    """Генерация речи клонированным голосом"""
    user_id = get_user_id(x_user_id)
    
    print(f"🔊 Генерация для voice_id: {req.voice_id}, user_id: {user_id}", flush=True)
    
    # 🔥 Ищем голос ТОЛЬКО этого пользователя
    voices = voice_cloner.list_available_voices(VOICES_DIR, user_id=user_id)
    voice_config = next((v for v in voices if v["id"] == req.voice_id), None)
    
    if not voice_config:
        raise HTTPException(404, f"Голос '{req.voice_id}' не найден")
    
    result = await voice_cloner.clone_voice(
        text=req.text, 
        speaker_wav=voice_config["sample_path"], 
        language=req.language if req.language != "auto" else None, 
        speed=req.speed
    )
    
    if not result["success"]:
        raise HTTPException(400, result.get("error", "Unknown error"))
    
    return Response(
        content=result["audio_data"], 
        media_type="audio/wav", 
        headers={
            "Content-Disposition": f"attachment; filename=cloned_{req.voice_id}.wav", 
            "X-Cloning-Duration": str(result["duration"])
        }
    )

@router.delete("/voices/{voice_id}")
async def delete_voice(voice_id: str, x_user_id: Optional[str] = Header(None, alias="X-User-ID")):
    """Удаление клонированного голоса"""
    user_id = get_user_id(x_user_id)
    
    print(f"🗑️ Удаление голоса: {voice_id}, user_id: {user_id}", flush=True)
    
    # 🔥 Проверяем, что голос принадлежит этому пользователю
    voices = voice_cloner.list_available_voices(VOICES_DIR, user_id=user_id)
    voice_exists = any(v["id"] == voice_id for v in voices)
    
    if not voice_exists:
        raise HTTPException(404, f"Голос '{voice_id}' не найден")
    
    success = voice_cloner.delete_voice(VOICES_DIR, voice_id)
    if not success:
        raise HTTPException(500, f"Не удалось удалить голос '{voice_id}'")
    
    # 🔥 Пересчитываем лимит
    new_count = voice_cloner.count_voices(VOICES_DIR, user_id=user_id)
    
    return {
        "message": f"✅ Голос '{voice_id}' удалён", 
        "limit": {"current": new_count, "max": voice_cloner.get_voice_limit()},
        "user_id": user_id
    }

@router.get("/test")
async def test_cloning():
    """Проверка доступности модели XTTS"""
    try:
        voice_cloner.get_tts_model()
        return {"status": "ok", "model": "xtts_v2", "message": "Модель XTTS готова к работе"}
    except Exception as e:
        raise HTTPException(503, f"Модель недоступна: {str(e)}")

@router.get("/info")
async def cloning_info():
    """Информация о возможностях сервиса"""
    return {
        "technology": "Coqui XTTS v2",
        "features": {
            "zero_shot_cloning": True, 
            "min_sample_duration": "3 seconds", 
            "recommended_sample_duration": "6-30 seconds",
            "supported_languages": ["ru", "en", "es", "fr", "de", "it", "pt", "pl", "tr", "zh", "ja", "ko"],
            "max_text_length": 500, 
            "speed_control": "0.5x - 2.0x", 
            "voice_limit": voice_cloner.get_voice_limit(),
            "user_isolation": True,  # 🔥 Новая фича
            "persistent_storage": True  # 🔥 Сохранение на диск
        },
        "tips": [
            "Используйте чистую запись без шума и музыки",
            "Говорите в том темпе и интонации, в которых хотите получать результат",
            "Для русского голоса говорите по-русски в образце",
            "Достаточно 6-10 секунд чёткой речи для хорошего результата"
        ]
    }