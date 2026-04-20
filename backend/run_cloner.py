# -*- coding: utf-8 -*-
"""
🎙️ Автономный сервер клонирования голосов
✅ Запускается отдельно от основного переводчика
✅ Порт 8001 (чтобы не конфликтовать с основным на 8000)
✅ Раздача статических файлов
✅ Исправлен импорт voice_cloner
✅ Сохранение голосов на диск между перезапусками
"""

import os, sys, mimetypes, json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

# ================= 🔧 Пути (абсолютные!) =================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))
VOICES_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "voices"))

print(f"📁 BASE_DIR: {BASE_DIR}", flush=True)
print(f"📁 FRONTEND_DIR: {FRONTEND_DIR}", flush=True)
print(f"📁 VOICES_DIR: {VOICES_DIR}", flush=True)

# ================= 🔥 Импортируем voice_cloner для доступа к лимиту =================
try:
    from . import voice_cloner
except ImportError as e:
    print(f"⚠️ Не удалось импортировать voice_cloner: {e}", flush=True)
    voice_cloner = None

# ================= 🏗️ FastAPI приложение =================
app = FastAPI(
    title="🎙️ Voice Cloning API",
    description="Автономный сервер для клонирования голосов на Coqui XTTS",
    version="1.0.0"
)

# 🔥 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= 🔥 Подключаем роутер клонирования =================
try:
    from .cloning_api import router as cloning_router
    app.include_router(cloning_router)
    print("✅ Модуль клонирования загружен", flush=True)
except ImportError as e:
    print(f"❌ Ошибка загрузки модуля клонирования: {e}", flush=True)
    sys.exit(1)

# ================= 🌐 Статические файлы =================
# 🔥 Монтируем папку frontend для раздачи статики
app.mount("/static", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")

# ================= 🎨 Маршруты (специфичные ДО универсальных!) =================

# 🔹 Главная страница
@app.get("/")
async def serve_cloning_ui():
    index_path = os.path.join(FRONTEND_DIR, "cloning.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    raise HTTPException(404, "cloning.html not found")

# 🔹 Страница клонирования
@app.get("/cloning")
async def serve_cloning_page():
    index_path = os.path.join(FRONTEND_DIR, "cloning.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    raise HTTPException(404, "cloning.html not found")

# 🔹 Health check
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "voice-cloning"}

# 🔹 Универсальный обработчик (ПОСЛЕДНИМ!)
@app.get("/{path:path}")
async def serve_any_file(path: str):
    """Раздаёт любые файлы из frontend/ папки"""
    # 🔥 Защита от выхода за пределы директории
    if ".." in path or path.startswith("/"):
        raise HTTPException(404, "Not found")
    
    file_path = os.path.join(FRONTEND_DIR, path)
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        mime_type, _ = mimetypes.guess_type(file_path)
        return FileResponse(file_path, media_type=mime_type or "application/octet-stream")
    
    raise HTTPException(404, f"File {path} not found")

# ================= 🚀 Запуск =================
if __name__ == "__main__":
    # 🔥 Создаём папки для голосов если нет
    samples_dir = os.path.join(VOICES_DIR, "samples")
    configs_dir = os.path.join(VOICES_DIR, "configs")
    os.makedirs(samples_dir, exist_ok=True)
    os.makedirs(configs_dir, exist_ok=True)
    
    # 🔥 Логируем существующие голоса при старте
    print(f"\n🔍 Сканирую сохранённые голоса в {configs_dir}...", flush=True)
    if os.path.exists(configs_dir):
        config_files = [f for f in os.listdir(configs_dir) if f.endswith('.json')]
        print(f"📁 Найдено конфигов: {len(config_files)}", flush=True)
        for cf in config_files[:5]:  # Показываем первые 5
            try:
                with open(os.path.join(configs_dir, cf), 'r', encoding='utf-8') as f:
                    cfg = json.load(f)
                    print(f"   - {cfg.get('name', 'N/A')} (user: {cfg.get('user_id', 'anonymous')})", flush=True)
            except:
                pass
        if len(config_files) > 5:
            print(f"   ... и ещё {len(config_files) - 5}", flush=True)
    else:
        print(f"⚠️ Папка configs не найдена!", flush=True)
    
    # 🔥 Получаем лимит голосов (безопасно)
    voice_limit = 10
    if voice_cloner and hasattr(voice_cloner, 'get_voice_limit'):
        voice_limit = voice_cloner.get_voice_limit()
    
    print("\n" + "="*60, flush=True)
    print("🎙️ ЗАПУСК СЕРВЕРА КЛОНИРОВАНИЯ ГОЛОСОВ", flush=True)
    print("="*60, flush=True)
    print(f"🔗 URL: http://localhost:8001", flush=True)
    print(f"📁 Frontend: {FRONTEND_DIR}", flush=True)
    print(f"📁 Voices: {VOICES_DIR}", flush=True)
    print(f"🎨 Интерфейс: http://localhost:8001/cloning", flush=True)
    print(f"📦 Статика: http://localhost:8001/static/", flush=True)
    print(f"🔢 Лимит голосов: {voice_limit}", flush=True)
    print("="*60 + "\n", flush=True)
    
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False, log_level="info")