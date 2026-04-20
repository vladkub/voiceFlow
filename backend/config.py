"""
🎛️ Конфигурация приложения (Pydantic v2 совместимо)
"""

import os
from typing import List
# 🔥 ИСПРАВЛЕНО: BaseSettings теперь в pydantic_settings
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # ================= 🌐 СЕРВЕР =================
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)
    DEBUG: bool = Field(default=False)
    
    # ================= 🔐 CORS =================
    ALLOWED_ORIGINS: List[str] = Field(default=["*"])
    
    # ================= 🌍 API =================
    GOOGLE_TRANSLATE_URL: str = "https://translate.googleapis.com/translate_a/single"
    
    # ================= 🔊 TTS настройки =================
    TTS_RATE: str = Field(default="+0%")
    TTS_VOLUME: str = Field(default="+0%")
    TTS_PITCH: str = Field(default="+0Hz")
    
    # ================= 📦 КЭШ =================
    CACHE_ENABLED: bool = Field(default=True)
    CACHE_TTL: int = Field(default=3600)
    
    # ================= 📊 МОНИТОРИНГ =================
    LOG_LEVEL: str = Field(default="INFO")
    REQUEST_TIMEOUT: int = Field(default=30)
    
    # ================= 🔧 ЛИМИТЫ =================
    MAX_TEXT_LENGTH: int = Field(default=500)
    MAX_QUEUE_SIZE: int = Field(default=100)
    
    # 🔥 Pydantic v2: новая конфигурация
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

# Глобальный экземпляр настроек
settings = Settings()

# ================= 🔄 УТИЛИТЫ =================

def get_cors_origins() -> List[str]:
    """Получает список разрешённых origin"""
    origins = []
    for origin in settings.ALLOWED_ORIGINS:
        if origin == "*":
            return ["*"]
        origins.append(origin.rstrip("/"))
    return origins

def is_production() -> bool:
    """Проверяет, запущено ли приложение в продакшене"""
    return not settings.DEBUG and os.getenv("ENVIRONMENT") == "production"