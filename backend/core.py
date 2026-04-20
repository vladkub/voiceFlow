"""
🎯 Multi-Task Hybrid Translator — CORE MODULE
✅ Используется и CLI, и веб-сервером
✅ Vosk + Google Translate + edge-tts + ffmpeg
✅ Асинхронная обработка + кэширование
"""

import os, sys, time, json, hashlib, asyncio, numpy as np, requests, re, subprocess
from vosk import Model, KaldiRecognizer
from io import BytesIO

# ================= 🎛 КОНФИГУРАЦИЯ =================
SAMPLE_RATE = 16000
RMS_THRESHOLD = 0.005
SILENCE_TIMEOUT = 0.5
API_TIMEOUT = 2.5
TTS_VOICE = "en-US-JennyNeural"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VOSK_RU_MODEL_PATH = os.path.join(BASE_DIR, "models", "vosk-ru-small")
CACHE_FILE = os.path.join(BASE_DIR, "cache_core.json")

TECH_TERMS = {
    "reentrancy": "reentrancy", "рингтон": "reentrancy", "ренси": "reentrancy",
    "delegatecall": "delegatecall", "делегаткол": "delegatecall", "делег": "delegate",
    "proxy": "proxy", "прокси": "proxy", "invariant": "invariant", "инвариант": "invariant",
    "foundry": "Foundry", "фордж": "forge", "solidity": "Solidity", "солидити": "Solidity",
    "gas": "gas", "газ": "gas", "oracle": "oracle", "оракл": "oracle",
    "revert": "revert", "require": "require", "assert": "assert",
}

# ================= 🗄 КЭШ =================
_cache = {}
if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            _cache = json.load(f)
    except:
        pass

def get_cache_key(*parts) -> str:
    return hashlib.md5(":".join(str(p).lower().strip() for p in parts).encode()).hexdigest()

def save_cache():
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_cache, f, ensure_ascii=False)
    except:
        pass

# ================= 🌐 HTTP СЕССИЯ =================
_http_session = requests.Session()
_http_session.headers.update({"User-Agent": "Mozilla/5.0"})

# ================= 🔤 ПЕРЕВОД =================
def fast_translate(text: str) -> tuple[str, float]:
    """Переводит текст, использует кэш"""
    original = text.lower().strip()
    if not original:
        return "translation ready", 0.0
    
    key = get_cache_key("translate", original)
    if key in _cache:
        return _cache[key]["result"], 0.0
    
    t_start = time.time()
    translated = None
    is_ru = lambda s: any(ord(c) > 127 for c in s)
    
    # Google Translate
    try:
        resp = _http_session.get(
            "https://translate.googleapis.com/translate_a/single",
            params={"client": "gtx", "sl": "ru", "tl": "en", "dt": "t", "q": original},
            timeout=API_TIMEOUT
        )
        if resp.status_code == 200:
            data = resp.json()
            translated = "".join([s[0] for s in data[0] if s and s[0]]).strip()
    except:
        pass
    
    # LibreTranslate fallback
    if not translated or is_ru(translated):
        try:
            resp = _http_session.post(
                "https://libretranslate.de/translate",
                json={"q": original, "source": "ru", "target": "en", "format": "text"},
                timeout=API_TIMEOUT
            )
            if resp.status_code == 200:
                fallback = resp.json().get("translatedText", "").strip()
                if fallback and not is_ru(fallback):
                    translated = fallback
        except:
            pass
    
    if not translated or is_ru(translated):
        translated = "please repeat your question"
    
    # Технические термины
    for ru_term, en_term in TECH_TERMS.items():
        if ru_term in original:
            translated = re.sub(r'\b' + re.escape(ru_term) + r'\b', en_term, translated, flags=re.I)
    
    _cache[key] = {"result": translated}
    return translated, time.time() - t_start

# ================= 🔊 TTS (edge-tts + ffmpeg) =================
async def generate_tts_audio(text: str, voice: str = TTS_VOICE) -> tuple[bytes, int, float]:
    """
    Генерирует аудио через edge-tts + ffmpeg.
    Возвращает: (pcm_bytes, sample_rate, duration_seconds)
    """
    text_clean = re.sub(r'[^a-zA-Z0-9\s\.\,\?\!\-\']', ' ', text).strip()
    text_clean = re.sub(r'\s+', ' ', text_clean) or "translation ready"
    
    key = get_cache_key("tts", text_clean, voice)
    if key in _cache and "pcm" in _cache[key]:
        pcm = np.array(_cache[key]["pcm"], dtype=np.float32)
        return pcm.tobytes(), _cache[key]["rate"], 0.0
    
    t_start = time.time()
    
    for attempt in range(2):
        try:
            import edge_tts
            # Генерация MP3 через edge-tts
            comm = edge_tts.Communicate(text_clean, voice)
            mp3_data = b""
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    mp3_data += chunk["data"]
            
            if len(mp3_data) < 500:
                raise Exception("Empty MP3 from edge-tts")
            
            # Конвертация MP3 → PCM (float32, mono, 24kHz) через ffmpeg
            cmd = [
                "ffmpeg", "-y", "-loglevel", "panic",
                "-i", "pipe:0",
                "-f", "f32le", "-ac", "1", "-ar", "24000",
                "pipe:1"
            ]
            proc = subprocess.Popen(
                cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            pcm_bytes, stderr = proc.communicate(input=mp3_data)
            
            if proc.returncode != 0 or len(pcm_bytes) < 1000:
                raise Exception(f"FFmpeg error: {proc.returncode}")
            
            # Кэшируем
            samples = np.frombuffer(pcm_bytes, dtype=np.float32).tolist()
            _cache[key] = {"pcm": samples, "rate": 24000}
            
            return pcm_bytes, 24000, time.time() - t_start
            
        except ImportError:
            raise Exception("edge-tts not installed: pip install edge-tts")
        except Exception as e:
            if attempt == 0:
                await asyncio.sleep(0.3)
                continue
            raise
    
    raise Exception("TTS generation failed after 2 attempts")

async def generate_tts_mp3(text: str, voice: str = TTS_VOICE) -> tuple[bytes, float]:
    """
    Генерирует MP3 для отправки в браузер (без конвертации в PCM).
    Возвращает: (mp3_bytes, duration_seconds)
    """
    text_clean = re.sub(r'[^a-zA-Z0-9\s\.\,\?\!\-\']', ' ', text).strip()
    text_clean = re.sub(r'\s+', ' ', text_clean) or "translation ready"
    
    key = get_cache_key("tts_mp3", text_clean, voice)
    if key in _cache and "mp3" in _cache[key]:
        return _cache[key]["mp3"], _cache[key]["duration"]
    
    t_start = time.time()
    
    for attempt in range(2):
        try:
            import edge_tts
            comm = edge_tts.Communicate(text_clean, voice)
            mp3_data = b""
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    mp3_data += chunk["data"]
            
            if len(mp3_data) < 500:
                raise Exception("Empty MP3")
            
            # Оценка длительности (~128 kbps MP3)
            duration = len(mp3_data) / (128000 / 8)
            
            _cache[key] = {"mp3": mp3_data, "duration": duration}
            return mp3_data, duration
            
        except ImportError:
            raise Exception("edge-tts not installed")
        except Exception as e:
            if attempt == 0:
                await asyncio.sleep(0.3)
                continue
            raise
    
    raise Exception("TTS MP3 generation failed")

# ================= 🎤 STT (Vosk) — инициализация =================
_vosk_model = None
_vosk_rec = None

def init_vosk(model_path: str = VOSK_RU_MODEL_PATH):
    """Инициализирует Vosk модель (вызывать один раз при старте)"""
    global _vosk_model, _vosk_rec
    if _vosk_model is not None:
        return
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Vosk model not found: {model_path}")
    
    _vosk_model = Model(model_path)
    _vosk_rec = KaldiRecognizer(_vosk_model, SAMPLE_RATE)

def transcribe_vosk(audio_bytes: bytes) -> str:
    """
    Распознаёт русскую речь через Vosk.
    audio_bytes: PCM int16, mono, 16kHz
    """
    global _vosk_rec
    if _vosk_rec is None:
        init_vosk()
    
    _vosk_rec.Reset()
    if _vosk_rec.AcceptWaveform(audio_bytes):
        return json.loads(_vosk_rec.Result()).get("text", "").strip()
    return json.loads(_vosk_rec.PartialResult()).get("partial", "").strip()

# ================= 🔄 VAD УТИЛИТА =================
def vad_detect(audio_np: np.ndarray, threshold: float = RMS_THRESHOLD) -> bool:
    """Определяет, есть ли речь в аудио-чанке"""
    if audio_np.dtype == np.float32:
        rms = np.sqrt(np.mean(audio_np ** 2))
    else:
        audio_int16 = audio_np.astype(np.int16) if audio_np.dtype != np.int16 else audio_np
        audio_float = audio_int16.astype(np.float32) / 32768.0
        rms = np.sqrt(np.mean(audio_float ** 2))
    return rms > threshold

# ================= 🎵 АУДИО УТИЛИТЫ =================
def convert_pcm_to_int16(pcm_float32: np.ndarray) -> bytes:
    """Конвертирует float32 PCM в int16 для Vosk"""
    return (np.clip(pcm_float32 * 32768, -32768, 32767).astype(np.int16)).tobytes()

def convert_pcm_to_mp3(pcm_bytes: bytes, sample_rate: int = 24000) -> bytes:
    """Конвертирует PCM в MP3 для отправки в браузер"""
    cmd = [
        "ffmpeg", "-y", "-loglevel", "panic",
        "-f", "f32le", "-ac", "1", "-ar", str(sample_rate), "-i", "pipe:0",
        "-b:a", "128k", "-f", "mp3", "pipe:1"
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    mp3_data, _ = proc.communicate(input=pcm_bytes)
    return mp3_data