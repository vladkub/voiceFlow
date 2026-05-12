# -*- coding: utf-8 -*-
"""
🎯 Voice Translator — Bilingual STT + Frontend Serving + Cloned Voices
✅ ✅ ИСПРАВЛЕНО: Pro-режим использует ТОЛЬКО gpt-4o-mini-transcribe
"""

import os, sys, time, json, hashlib, asyncio, numpy as np, requests, re, subprocess, edge_tts, queue, threading, concurrent.futures, logging, traceback, tempfile, soundfile as sf, sqlite3, bcrypt, secrets, base64, io, uuid
import aiohttp, openai
from vosk import Model, KaldiRecognizer
from fastapi import FastAPI, HTTPException, Request, Response, BackgroundTasks, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Tuple
from contextlib import asynccontextmanager

# 🔥 Загружаем .env: сначала корень репозитория, затем backend/ (при запуске из backend cwd не видит ../.env)
from dotenv import load_dotenv
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.abspath(os.path.join(_backend_dir, ".."))
load_dotenv(os.path.join(_repo_root, ".env"))
load_dotenv(os.path.join(_backend_dir, ".env"))
load_dotenv()

# 🔥 Отладка: проверяем что загрузилось
print(f"🔍 AITUNNEL_API_KEY из env: {os.getenv('AITUNNEL_API_KEY', 'НЕ НАЙДЕН')[:20]}...", flush=True)
print(f"🔍 AITUNNEL_BASE_URL из env: {os.getenv('AITUNNEL_BASE_URL', 'НЕ НАЙДЕН')}", flush=True)
_stripe_sk = (os.getenv("STRIPE_SECRET_KEY") or os.getenv("STRIPE_API_KEY") or "").strip()
print(
    f"💳 Stripe: {'секретный ключ загружен' if _stripe_sk else 'STRIPE_SECRET_KEY не задан — /api/stripe/create вернёт 503'}",
    flush=True,
)

# ================= 🔧 WINDOWS ENCODING FIX =================
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    except Exception:
        pass

# ================= 🔊 LOGGING SETUP — БЕЗ СПАМА =================
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logging.getLogger("uvicorn.access").setLevel(logging.ERROR)
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("fastapi").setLevel(logging.WARNING)

# ================= 🔑 AI CONFIGURATION =================
OPENROUTER_API_KEY = "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"
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
PRIORITY_MODELS = ["openai/gpt-3.5-turbo", "meta-llama/llama-3-8b-instruct", "google/gemma-7b-it"]
_ai_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="AI")

# ================= 🔑 AITUNNEL CONFIGURATION =================
AITUNNEL_API_KEY = os.getenv("AITUNNEL_API_KEY", "")
AITUNNEL_BASE_URL = os.getenv("AITUNNEL_BASE_URL", "https://api.aitunnel.ru/v1")
# gpt-4o-mini-transcribe может иногда возвращать prompt как "распознанный" текст.
# По умолчанию отключаем prompt для STT; при необходимости можно включить через env.
AITUNNEL_STT_USE_PROMPT = os.getenv("AITUNNEL_STT_USE_PROMPT", "0").strip().lower() in ("1", "true", "yes", "on")

# 🔥 Проверяем готовность AITunnel
if AITUNNEL_API_KEY and not AITUNNEL_API_KEY.startswith("ваш_ключ"):
    print("✅ AITunnel API ключ найден")
    AITUNNEL_READY = True
    aitunnel_client = openai.OpenAI(api_key=AITUNNEL_API_KEY, base_url=AITUNNEL_BASE_URL)
else:
    print("⚠️ AITunnel API ключ не настроен — режим Pro будет использовать fallback на Vosk")
    AITUNNEL_READY = False
    aitunnel_client = None

# ================= 🎤 VOSK LOADING =================
print("⏳ Загрузка моделей Vosk...", flush=True)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Ключ — двухбуквенный код языка (как в UI). Значение — список имён папок в backend/models/ (первая найденная загружается).
# Официальные small-модели: https://alphacephei.com/vosk/models — можно распаковать как vosk-de-small или оставить имя архива.
VOSK_MODEL_CANDIDATES: Dict[str, List[str]] = {
    "ru": ["vosk-ru-small"],
    "en": ["vosk-en-small"],
    "de": ["vosk-de-small", "vosk-model-small-de-0.15"],
    "fr": ["vosk-fr-small", "vosk-model-small-fr-0.22"],
    "es": ["vosk-es-small", "vosk-model-small-es-0.42"],
}

vosk_models: Dict[str, Model] = {}


def _try_load_vosk_model(lang: str) -> Optional[Model]:
    for dirname in VOSK_MODEL_CANDIDATES.get(lang, []):
        path = os.path.join(BASE_DIR, "models", dirname)
        if not os.path.isdir(path):
            continue
        try:
            print(f"   📦 Vosk [{lang}] ← models/{dirname}", flush=True)
            return Model(path)
        except Exception as e:
            print(f"   ⚠️ Vosk [{lang}] ошибка ({dirname}): {e}", flush=True)
    return None


for _lang in ("ru", "en", "de", "fr", "es"):
    _m = _try_load_vosk_model(_lang)
    if _m is not None:
        vosk_models[_lang] = _m

if "ru" not in vosk_models:
    print(
        "   ❌ Нужна русская модель Vosk: backend/models/vosk-ru-small\n"
        "      https://alphacephei.com/vosk/models",
        flush=True,
    )
    sys.exit(1)

vosk_ru_model = vosk_models.get("ru")
vosk_en_model = vosk_models.get("en")

_loaded = ", ".join(sorted(vosk_models.keys()))
print(f"✅ Vosk (Basic): загружены языки [{_loaded}]", flush=True)
_missing_ui = [x for x in ("en", "de", "fr", "es") if x not in vosk_models]
if _missing_ui:
    print(
        f"   ℹ️ Нет моделей для {', '.join(_missing_ui)} — в Basic будет fallback en→ru.\n"
        "      Добавьте small-модели в backend/models/ (см. VOSK_MODEL_CANDIDATES в web_server.py).",
        flush=True,
    )
print("", flush=True)

# ================= 🔊 AUDIO DEVICES =================
import sounddevice as sd

def safe_query_devices(timeout=5):
    def _query(): return sd.query_devices()
    result = [None]
    def _worker():
        try: result[0] = _query()
        except: result[0] = []
    thread = threading.Thread(target=_worker); thread.daemon = True
    thread.start(); thread.join(timeout=timeout)
    return result[0] if result[0] is not None else []

def list_playback_devices():
    print("🔍 ДОСТУПНЫЕ УСТРОЙСТВА:", flush=True)
    try:
        devs = safe_query_devices(timeout=3)
        for i, d in enumerate(devs):
            if d['max_output_channels'] > 0:
                print(f"   [{i}] {d['name'][:45]}{' (DEFAULT)' if i == sd.default.device[1] else ''}")
    except: pass
    print(flush=True)

# ================= 🎛 КОНФИГУРАЦИЯ =================
SAMPLE_RATE = 16000


def _vosk_build_recognizer(lang_code: str) -> Optional[KaldiRecognizer]:
    """Распознаватель для режима Basic: язык из UI, иначе en → ru → любая доступная модель."""
    lang = (lang_code or "").lower().strip()[:2]
    if not lang:
        lang = "en"
    for attempt in (lang, "en", "ru"):
        m = vosk_models.get(attempt)
        if m is not None:
            return KaldiRecognizer(m, SAMPLE_RATE)
    for m in vosk_models.values():
        return KaldiRecognizer(m, SAMPLE_RATE)
    return None


MIC_RMS_THRESHOLD_DEFAULT = 0.002
MIC_RMS_THRESHOLD_MIN = 0.0003
MIC_RMS_THRESHOLD_MAX = 0.018
# Пауза тишины до конца фразы: 0.5 с резала длинные мысли на несколько сообщений; ~1.65 с — типичные паузы внутри фразы не режут. Переменная VOICE_SILENCE_TIMEOUT (сек), разумный диапазон 0.8–3.0.
try:
    _st = float(os.getenv("VOICE_SILENCE_TIMEOUT", "1.65"))
except (TypeError, ValueError):
    _st = 1.65
SILENCE_TIMEOUT = min(3.0, max(0.8, _st))
PHRASE_SILENCE_MIN_SEC = 0.8
PHRASE_SILENCE_MAX_SEC = 3.0
VAD_CHUNK = 0.05
CACHE_FILE = os.path.join(BASE_DIR, "cache_hybrid.json")
STATE_FILE = os.path.join(BASE_DIR, "conference_state.json")
API_TIMEOUT = 2.5
TTS_VOICE = "en-US-JennyNeural"
PARTNER_TTS_VOICE = "en-US-GuyNeural"
SUPPORTED_SAMPLE_RATES = [44100, 48000, 24000]
_translate_executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)

TECH_TERMS = {"reentrancy": "reentrancy", "рингтон": "reentrancy", "ренси": "reentrancy", "delegatecall": "delegatecall", "делегаткол": "delegatecall", "делег": "delegate", "proxy": "proxy", "прокси": "proxy", "solidity": "Solidity", "солидити": "Solidity", "gas": "gas", "газ": "gas", "oracle": "oracle", "оракл": "oracle", "revert": "revert", "require": "require", "assert": "assert"}

cache = {}
if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f: cache = json.load(f)
    except: pass

def get_cache_key(*parts): return hashlib.md5(":".join(str(p).lower().strip() for p in parts).encode()).hexdigest()
def save_cache():
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f: json.dump(cache, f, ensure_ascii=False)
    except: pass

http_session = requests.Session()
http_session.headers.update({"User-Agent": "Mozilla/5.0"})

# ================= 🔤 ПЕРЕВОД =================
def fast_translate_sync(text, target_lang: str = "en"):
    original = text.lower().strip()
    if not original: return "translation ready", 0.0
    key = get_cache_key("translate", original, target_lang)
    if key in cache: return cache[key]["result"], 0.0
    t_start = time.time(); translated = None
    is_ru = lambda s: any(ord(c) > 127 for c in s)
    try:
        sl = "auto"
        resp = http_session.get("https://translate.googleapis.com/translate_a/single", params={"client": "gtx", "sl": sl, "tl": target_lang, "dt": "t", "q": original}, timeout=API_TIMEOUT)
        if resp.status_code == 200: 
            data = resp.json()
            translated = "".join([s[0] for s in data[0] if s[0]]).strip()
    except: pass
    if not translated or (target_lang == "en" and is_ru(translated)):
        try:
            resp = http_session.post("https://libretranslate.de/translate", json={"q": original, "source": "auto", "target": target_lang, "format": "text"}, timeout=API_TIMEOUT)
            if resp.status_code == 200: 
                fallback = resp.json().get("translatedText", "").strip()
                if fallback and not (target_lang == "en" and is_ru(fallback)): translated = fallback
        except: pass
    if not translated: translated = "please repeat your question"
    for ru_term, en_term in TECH_TERMS.items():
        if ru_term in original: translated = re.sub(r'\b(re-?entry|reenter|rentancy|delegat.?call)\b', en_term, translated, flags=re.I)
    cache[key] = {"result": translated}
    return translated, time.time() - t_start

# ================= 🔊 TTS =================
async def speak_text(text, voice: str = TTS_VOICE, preferred_rate: int = 44100):
    text_clean = re.sub(r'[^a-zA-Z0-9\s\.\,\?\!\-\']', ' ', text).strip()
    text_clean = re.sub(r'\s+', ' ', text_clean) or "translation ready"
    for rate in SUPPORTED_SAMPLE_RATES:
        key = get_cache_key("tts", text_clean, voice, rate)
        if key in cache and "samples" in cache[key]: return np.array(cache[key]["samples"], dtype=np.float32), cache[key]["rate"], 0.0
    t_start = time.time()
    for attempt in range(2):
        for rate in SUPPORTED_SAMPLE_RATES:
            try:
                comm = edge_tts.Communicate(text_clean, voice); mp3_data = b""
                async for chunk in comm.stream():
                    if chunk["type"] == "audio": mp3_data += chunk["data"]
                if len(mp3_data) < 500: raise Exception("Empty")
                cmd = ["ffmpeg", "-y", "-loglevel", "panic", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", str(rate), "pipe:1"]
                proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE); pcm_bytes, _ = proc.communicate(input=mp3_data)
                if proc.returncode != 0 or not pcm_bytes: raise Exception("FFmpeg")
                samples = np.frombuffer(pcm_bytes, dtype=np.float32).tolist()
                cache[get_cache_key("tts", text_clean, voice, rate)] = {"samples": samples, "rate": rate}
                return np.array(samples, dtype=np.float32), rate, time.time() - t_start
            except:
                if rate == SUPPORTED_SAMPLE_RATES[-1] and attempt == 0: await asyncio.sleep(0.3); continue
    return None, None, time.time() - t_start

# ================= 🎙️ VOICE CLONING PROXY =================
CLONING_API_BASE = "http://localhost:8001/api/clone"
CLONING_TIMEOUT = 300.0
VOICES_ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "voices"))
# Базовый URL сервиса клонирования на Modal (тот же путь, что у локального: /generate, /voices, /preview)
MODAL_CLONING_API_BASE = (os.environ.get("MODAL_CLONING_API_BASE") or "").strip().rstrip("/")
# Modal: долгий cold start (GPU + XTTS); connect — быстрый отказ при недоступности хоста
MODAL_CLONING_CONNECT_TIMEOUT = float(os.environ.get("MODAL_CLONING_CONNECT_TIMEOUT", "30"))
MODAL_CLONING_READ_TIMEOUT = float(os.environ.get("MODAL_CLONING_READ_TIMEOUT", "600"))


def _effective_cloning_base(use_modal: bool) -> str:
    if use_modal and MODAL_CLONING_API_BASE:
        return MODAL_CLONING_API_BASE
    if use_modal and not MODAL_CLONING_API_BASE:
        print("⚠️ clone_via_modal: MODAL_CLONING_API_BASE не задан — используется локальный CLONING_API_BASE", flush=True)
    return str(CLONING_API_BASE or "").rstrip("/")

def _sync_get_clone_voices(base: str, user_id: str, timeout) -> list:
    r = requests.get(f"{base.rstrip('/')}/voices", headers={"X-User-ID": str(user_id)}, timeout=timeout)
    if r.ok:
        return r.json().get("voices", [])
    return []


async def get_cloned_voices(user_id: str):
    """Сначала HTTP к локальному cloning_api (:8001); если недоступен или пусто — те же конфиги с диска (как у run_cloner)."""
    uid = str(user_id or "").strip() or "anonymous"
    base = str(CLONING_API_BASE or "").rstrip("/")
    remote: list = []
    try:
        remote = await asyncio.to_thread(_sync_get_clone_voices, base, uid, 60.0)
        remote = remote if isinstance(remote, list) else []
    except Exception as e:
        err = str(e)
        if "10061" in err or "Connection refused" in err or "Failed to establish" in err or "NewConnectionError" in err:
            print("⚠️ Клон-сервер :8001 недоступен — список клонов с диска (voices/)", flush=True)
        else:
            print(f"⚠️ Cloning API error: {e}", flush=True)
    if len(remote) > 0:
        return remote
    try:
        from . import voice_cloner
        local = voice_cloner.list_available_voices(VOICES_ROOT_DIR, user_id=uid)
        return local if isinstance(local, list) else []
    except Exception as e2:
        print(f"⚠️ Локальное сканирование voices: {e2}", flush=True)
    return []


def _sync_post_clone_generate(
    base: str, user_id: str, voice_id: str, text: str, speed: float, timeout, log_progress: bool = False
):
    stop_ev = None
    if log_progress:
        stop_ev = threading.Event()

        def _tick():
            w = 0
            while not stop_ev.wait(15):
                w += 15
                print(f"🔊 generate_cloned_audio: ожидание ответа Modal… ~{w}s", flush=True)

        threading.Thread(target=_tick, daemon=True).start()
    try:
        return requests.post(
            f"{base.rstrip('/')}/generate",
            headers={"X-User-ID": str(user_id), "Content-Type": "application/json"},
            json={"voice_id": voice_id, "text": text, "speed": speed},
            timeout=timeout,
        )
    finally:
        if stop_ev is not None:
            stop_ev.set()


def _sync_modal_upload_voice_from_local(base: str, user_id: str, voice_id: str, timeout) -> bool:
    """Загружает локальный голос в Modal с тем же voice_id (если найден локально)."""
    uid = str(user_id or "").strip() or "anonymous"
    vid = str(voice_id or "").strip()
    if not vid:
        return False

    config_path = os.path.join(VOICES_ROOT_DIR, uid, "configs", f"{vid}.json")
    if not os.path.isfile(config_path):
        return False
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    except Exception as e:
        print(f"⚠️ modal upload bridge: не удалось прочитать config {config_path}: {e}", flush=True)
        return False

    sample_path = str(cfg.get("sample_path") or "").strip()
    if not sample_path or not os.path.isfile(sample_path):
        samples_dir = os.path.join(VOICES_ROOT_DIR, uid, "samples")
        for ext in (".wav", ".mp3", ".ogg", ".flac", ".m4a", ".webm"):
            cand = os.path.join(samples_dir, f"{vid}{ext}")
            if os.path.isfile(cand):
                sample_path = cand
                break
    if not sample_path or not os.path.isfile(sample_path):
        print(f"⚠️ modal upload bridge: sample_path не найден для voice_id={vid}", flush=True)
        return False

    name = str(cfg.get("name") or f"Voice {vid}").strip() or f"Voice {vid}"
    language = str(cfg.get("language") or "auto").strip() or "auto"
    filename = os.path.basename(sample_path)
    ctype = "audio/wav"
    low = filename.lower()
    if low.endswith(".mp3"):
        ctype = "audio/mpeg"
    elif low.endswith(".ogg"):
        ctype = "audio/ogg"
    elif low.endswith(".flac"):
        ctype = "audio/flac"
    elif low.endswith(".m4a"):
        ctype = "audio/mp4"
    elif low.endswith(".webm"):
        ctype = "audio/webm"

    try:
        with open(sample_path, "rb") as fh:
            files = {"file": (filename, fh, ctype)}
            data = {"name": name, "language": language, "voice_id": vid}
            r = requests.post(
                f"{base.rstrip('/')}/upload-sample",
                headers={"X-User-ID": uid},
                data=data,
                files=files,
                timeout=timeout,
            )
        if r.ok:
            print(f"✅ modal upload bridge: voice_id={vid} загружен в Modal", flush=True)
            return True
        print(f"⚠️ modal upload bridge: upload failed {r.status_code} - {r.text[:200]}", flush=True)
    except Exception as e:
        print(f"⚠️ modal upload bridge: исключение upload-sample: {e}", flush=True)
    return False


def _sync_modal_has_voice(base: str, user_id: str, voice_id: str, timeout) -> bool:
    uid = str(user_id or "").strip() or "anonymous"
    vid = str(voice_id or "").strip()
    if not vid:
        return False
    try:
        r = requests.get(
            f"{base.rstrip('/')}/voices",
            headers={"X-User-ID": uid},
            params={"refresh": "1"},
            timeout=timeout,
        )
        if not r.ok:
            return False
        voices = r.json().get("voices", [])
        ids = {str(v.get("id")) for v in (voices or [])}
        return vid in ids
    except Exception:
        return False


def _sync_modal_wait_for_voice(base: str, user_id: str, voice_id: str, timeout, attempts: int = 6, sleep_s: float = 0.35) -> bool:
    """Короткий polling после upload, пока voice_id не появится в Modal /voices."""
    for _ in range(max(1, attempts)):
        if _sync_modal_has_voice(base, user_id, voice_id, timeout):
            return True
        time.sleep(max(0.05, float(sleep_s)))
    return False


def _sd_play_blocking(samples, samplerate: int, device) -> None:
    sd.play(samples, samplerate=samplerate, device=device)
    sd.wait()


async def generate_cloned_audio(text: str, voice_id: str, user_id: str, speed: float = 1.0, use_modal: bool = False):
    base = _effective_cloning_base(use_modal)
    if use_modal and MODAL_CLONING_API_BASE:
        timeout = (MODAL_CLONING_CONNECT_TIMEOUT, MODAL_CLONING_READ_TIMEOUT)
        tdesc = f"connect={MODAL_CLONING_CONNECT_TIMEOUT}s read={MODAL_CLONING_READ_TIMEOUT}s"
    else:
        timeout = CLONING_TIMEOUT
        tdesc = f"{CLONING_TIMEOUT}s"
    print(f"🔊 generate_cloned_audio: text='{text[:50]}...', voice_id={voice_id}, user_id={user_id}, base={base}, use_modal={use_modal}, timeout={tdesc}", flush=True)
    try:
        log_prog = bool(use_modal and MODAL_CLONING_API_BASE)
        if log_prog:
            # Перед generate проверяем, есть ли голос в Modal. Если нет — отправляем локальный sample.
            has_voice = await asyncio.to_thread(_sync_modal_has_voice, base, user_id, voice_id, timeout)
            if not has_voice:
                print(f"ℹ️ generate_cloned_audio: voice_id={voice_id} отсутствует в Modal, отправляем sample", flush=True)
                uploaded = await asyncio.to_thread(
                    _sync_modal_upload_voice_from_local,
                    base,
                    user_id,
                    voice_id,
                    timeout,
                )
                if uploaded:
                    ready = await asyncio.to_thread(
                        _sync_modal_wait_for_voice, base, user_id, voice_id, timeout
                    )
                    if ready:
                        print(f"✅ generate_cloned_audio: sample отправлен и voice_id={voice_id} появился в Modal", flush=True)
                    else:
                        print(f"⚠️ generate_cloned_audio: sample отправлен, но voice_id={voice_id} не появился в Modal вовремя", flush=True)
                        return None
                else:
                    print(f"⚠️ generate_cloned_audio: не удалось отправить sample в Modal для voice_id={voice_id}", flush=True)
                    return None

        resp = await asyncio.to_thread(
            _sync_post_clone_generate, base, user_id, voice_id, text, speed, timeout, log_prog
        )
        print(f"🔊 generate_cloned_audio: ответ сервиса, status={resp.status_code}", flush=True)
        if resp.ok:
            n = len(resp.content or b"")
            if n < 200:
                print(f"⚠️ generate_cloned_audio: слишком короткое тело ответа ({n} байт), как у ошибки/пустого WAV", flush=True)
                return None
            print(f"🔊 generate_cloned_audio: аудио получено, длина={n} байт", flush=True)
            return resp.content
        err_text = (resp.text or "")[:500]
        print(f"⚠️ generate_cloned_audio: ошибка сервиса: {resp.status_code} - {err_text[:200]}", flush=True)
        # Modal strict-mode: если voice_id отсутствует, пробуем авто-загрузить локальный сэмпл
        # в Modal (с тем же voice_id), затем повторяем generate в Modal.
        modal_voice_missing = (
            bool(use_modal and MODAL_CLONING_API_BASE)
            and resp.status_code == 404
            and ("voice_id" in err_text.lower())
            and ("not found" in err_text.lower())
        )
        if modal_voice_missing:
            uploaded = await asyncio.to_thread(
                _sync_modal_upload_voice_from_local,
                base,
                user_id,
                voice_id,
                timeout,
            )
            if uploaded:
                ready = await asyncio.to_thread(
                    _sync_modal_wait_for_voice, base, user_id, voice_id, timeout
                )
                if not ready:
                    print("⚠️ generate_cloned_audio: upload после 404 выполнен, но voice_id не появился в Modal вовремя", flush=True)
                    return None
                print("↩️ generate_cloned_audio: повтор generate после upload-sample в Modal", flush=True)
                retry_resp = await asyncio.to_thread(
                    _sync_post_clone_generate, base, user_id, voice_id, text, speed, timeout, log_prog
                )
                print(f"↩️ generate_cloned_audio: retry status={retry_resp.status_code}", flush=True)
                if retry_resp.ok:
                    n2 = len(retry_resp.content or b"")
                    if n2 >= 200:
                        print(f"✅ generate_cloned_audio: retry OK, длина={n2} байт", flush=True)
                        return retry_resp.content
                    print(f"⚠️ generate_cloned_audio: retry слишком короткий WAV ({n2} байт)", flush=True)
    except requests.exceptions.Timeout as e:
        print(f"⚠️ generate_cloned_audio: таймаут ({tdesc}): {e}", flush=True)
    except Exception as e:
        print(f"⚠️ generate_cloned_audio: исключение: {e}", flush=True)
    return None


from . import trial_flow

trial_flow.configure(openrouter_key=OPENROUTER_API_KEY or "", openrouter_endpoint=OPENROUTER_ENDPOINT or "")


async def _trial_clone_tts_bridge(text: str, voice_id: str, user_id: str, use_modal: bool):
    return await generate_cloned_audio(text, voice_id, user_id, speed=1.0, use_modal=use_modal)


trial_flow.set_clone_tts_handler(_trial_clone_tts_bridge)

# ================= 🎤 STT (УНИВЕРСАЛЬНАЯ С АЛЬТЕРНАТИВАМИ) =================
def transcribe_audio_with_alternatives(audio_data, recognizer, num_alternatives=3):
    if recognizer is None: return {"text": "", "alternatives": [], "confidence": None}
    audio_int16 = (audio_data * 32768).astype(np.int16) if audio_data.dtype == np.float32 else audio_data.astype(np.int16)
    recognizer.Reset()
    if recognizer.AcceptWaveform(audio_int16.tobytes()):
        result = json.loads(recognizer.Result())
        main_text = result.get("text", "").strip()
        alternatives = result.get("alternatives", [])[:num_alternatives]
        alt_texts = [alt.get("text", "").strip() for alt in alternatives if alt.get("text")]
        confidence = result.get("partial_confidence") or result.get("confidence")
        return {"text": main_text, "alternatives": alt_texts, "confidence": confidence}
    partial = json.loads(recognizer.PartialResult())
    return {"text": partial.get("partial", "").strip(), "alternatives": [], "confidence": None}

# ================= 🤖 PRO RECOGNITION (AITUNNEL) =================
# 🔥 ТОЛЬКО gpt-4o-mini-transcribe — никаких других моделей!
AITUNNEL_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe"


def _extract_aitunnel_transcription_text(response) -> Optional[str]:
    if response is None:
        return None
    t = getattr(response, "text", None)
    if t is not None and str(t).strip():
        return str(t).strip()
    if isinstance(response, dict):
        t = response.get("text")
        if t is not None and str(t).strip():
            return str(t).strip()
    try:
        d = response.model_dump() if hasattr(response, "model_dump") else None
        if isinstance(d, dict) and d.get("text"):
            return str(d["text"]).strip()
    except Exception:
        pass
    return None


def _optional_stt_vocab_prompt(topic: str, max_chars: int = 220) -> Optional[str]:
    """
    Только короткая лексика темы для bias Whisper-подобных моделей.
    Нельзя передавать инструкции («не пиши код», «дословно») — gpt-4o-mini-transcribe
    подмешивает текст prompt в «транскрипт», из-за чего в чате оказывается системный текст вместо речи.
    """
    t = (topic or "").strip()
    if not t or t.lower() in ("general conversation", "general"):
        return None
    t = re.sub(r"\s+", " ", t)
    if len(t) > max_chars:
        t = t[: max_chars - 1] + "…"
    return t


def _looks_like_prompt_echo(transcript: str, prompt: str) -> bool:
    """
    Защита от ситуации, когда STT возвращает сам prompt вместо реальной речи.
    """
    tx = re.sub(r"\s+", " ", str(transcript or "").strip().lower())
    pr = re.sub(r"\s+", " ", str(prompt or "").strip().lower())
    if not tx or not pr:
        return False
    if tx == pr:
        return True
    if len(pr) >= 8 and (tx in pr or pr in tx):
        return True
    return False

async def transcribe_with_aitunnel(audio_data: np.ndarray, language: str = "ru", topic_hint: str = "") -> Optional[dict]:
    """
    🔥 Распознавание через AITunnel API — ТОЛЬКО модель gpt-4o-mini-transcribe
    Несколько попыток при сетевых/временных сбоях; не отказываемся из‑за «тихого» RMS так агрессивно, как раньше.
    """
    if not AITUNNEL_READY or not aitunnel_client:
        print("⚠️ AITunnel не готов — используем fallback на Vosk", flush=True)
        return None

    rms = float(np.sqrt(np.mean(audio_data**2)))
    if rms < 1e-6:
        print(f"⚠️ Аудио без сигнала (RMS={rms:.2e}) — пропускаем AITunnel", flush=True)
        return None
    if rms < 0.0004:
        print(f"⚠️ Очень тихий сигнал RMS={rms:.6f}, всё равно пробуем AITunnel (Pro)", flush=True)

    temp_path = None
    try:
        temp_fd, temp_path = tempfile.mkstemp(suffix=".wav", prefix="aitunnel_")
        os.close(temp_fd)
        sf.write(temp_path, audio_data, SAMPLE_RATE, format="WAV")
        file_size = os.path.getsize(temp_path)
        duration = len(audio_data) / SAMPLE_RATE
        print(f"💾 Временный файл: {temp_path} ({file_size} байт, {duration:.2f} сек, RMS={rms:.6f})", flush=True)

        vocab_prompt = _optional_stt_vocab_prompt(topic_hint) if AITUNNEL_STT_USE_PROMPT else None
        max_attempts = 3
        last_err = None

        for attempt in range(1, max_attempts + 1):
            try:
                with open(temp_path, "rb") as audio_file:
                    kwargs = {
                        "model": AITUNNEL_TRANSCRIBE_MODEL,
                        "file": audio_file,
                        "response_format": "json",
                    }
                    if language:
                        kwargs["language"] = language
                    if vocab_prompt:
                        kwargs["prompt"] = vocab_prompt
                        print(f"📝 STT prompt (только лексика темы): {len(vocab_prompt)} chars", flush=True)
                    try:
                        response = aitunnel_client.audio.transcriptions.create(**kwargs)
                    except Exception as e_prompt:
                        if vocab_prompt and "prompt" in kwargs:
                            print(f"⚠️ STT с prompt не принят ({e_prompt}), повтор без prompt", flush=True)
                            kwargs.pop("prompt", None)
                            with open(temp_path, "rb") as audio_file2:
                                kwargs["file"] = audio_file2
                                response = aitunnel_client.audio.transcriptions.create(**kwargs)
                        else:
                            raise

                text = _extract_aitunnel_transcription_text(response)
                print(f"📦 AITunnel попытка {attempt}/{max_attempts}: type={type(response)}, len={len(text or '')}", flush=True)

                if text and len(text) >= 2:
                    if vocab_prompt and _looks_like_prompt_echo(text, vocab_prompt):
                        last_err = "prompt_echo_filtered"
                        print("⚠️ AITunnel: отфильтрован echo prompt в транскрипте", flush=True)
                        continue
                    print(f"✅ AITunnel: '{text[:120]}{'…' if len(text) > 120 else ''}'", flush=True)
                    return {
                        "text": text,
                        "alternatives": [],
                        "confidence": 1.0,
                        "source": "aitunnel-gpt4o-mini-transcribe",
                        "model": AITUNNEL_TRANSCRIBE_MODEL,
                    }
                last_err = "empty_or_short_transcript"
                print(f"⚠️ AITunnel: пустой/короткий ответ (попытка {attempt})", flush=True)
            except Exception as e:
                last_err = str(e)
                print(f"❌ AITunnel попытка {attempt}/{max_attempts}: {type(e).__name__}: {e}", flush=True)

            if attempt < max_attempts:
                await asyncio.sleep(0.42 + 0.38 * attempt)

        print(f"⚠️ AITunnel: все попытки исчерпаны, последнее: {last_err}", flush=True)
        return None

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception:
                pass

# ================= 🔄 АУДИО-ДВИЖОК =================
class AudioEngine:
    def __init__(self):
        self.task_queue = asyncio.Queue(); self.audio_queue = queue.Queue(); self.main_loop = None
        self.buffer, self.speaking, self.silence_time = [], False, 0.0; self.task_counter = 0; self.stream = None; self.running = False; self.conference_mode = False
        self.mic_idx = None; self.speaker_idx = None; self.vb_cable_input = None; self.vb_cable_output = None; self.original_playback_idx = None
        self.history = []; self.history_lock = threading.Lock(); self.ai_enabled = False; self.ai_topic = ""
        self.partner_stream = None; self.partner_buffer = []; self.partner_speaking = False; self.partner_silence_time = 0.0
        self.partner_vad_chunk = 0.05
        self.phrase_silence_sec = float(SILENCE_TIMEOUT)
        self.partner_silence_timeout = self.phrase_silence_sec
        _fb = _vosk_build_recognizer("en")
        self.partner_rec = _fb
        self.partner_mic_idx = None
        self.mic_rms_threshold = float(MIC_RMS_THRESHOLD_DEFAULT)
        self.unmute_mode = False; self.last_user_speak_time = 0; self.partner_mute_duration = 2.5
        # Пока идёт озвучка перевода пользователя (Modal/TTS), не слать микрофон в VAD — иначе эхо/шум дают пустые задачи и мешают очереди
        self.user_mic_suppress_until = 0.0
        # Одна пользовательская фраза в STT за раз (колбэк микрофона не ждёт AITunnel — иначе вторая «фраза» попадает в очередь с шумом)
        self._user_stt_semaphore = threading.Semaphore(1)
        self.user_language = "ru"
        self.partner_language = "en"
        self.translation_paused = False
        self.last_mic_rms = 0.0
        self.last_mic_peak = 0.0
        # 🔥 НОВОЕ: Режим распознавания
        self.recognition_mode = 'basic'
        
        # 🔥 НОВОЕ: Очередь для многопоточного распознавания
        self.recognition_queue = asyncio.Queue(maxsize=10)  # 🔥 Очередь задач (макс 10)
        self.recognition_lock = asyncio.Lock()  # 🔥 Защита общих ресурсов
        self._voice_play_lock = asyncio.Lock()  # 🔥 Один поток озвучки: параллельные sd.play ломали последнюю фразу
        self.worker_task = None  # 🔥 Задача воркера
        self.pending_tasks = {}  # 🔥 Отслеживание задач: {task_id: audio_data}
        
        list_playback_devices(); self._find_devices()
        if os.path.exists(STATE_FILE):
            try: os.remove(STATE_FILE); print("🔄 Авто-сброс: конференция выключена", flush=True)
            except: pass
        _vm = ",".join(sorted(vosk_models.keys())) if vosk_models else "—"
        print(f"✅ AudioEngine готов | Vosk Basic: [{_vm}]", flush=True)
        print(f"   🎤 Mic: [{self.mic_idx}] | 🎧 Speaker: [{self.speaker_idx}] | 🔁 Cable: [{self.vb_cable_input}]", flush=True)

    def _find_devices(self):
        devs = safe_query_devices(timeout=3); self.vb_cable_input = None; self.vb_cable_output = None; self.partner_mic_idx = None
        for i, d in enumerate(devs):
            name = d['name'].lower()
            if 'cable input' in name and '16ch' not in name and d['max_output_channels'] > 0 and self.vb_cable_input is None: self.vb_cable_input = i
            if 'cable output' in name and d['max_input_channels'] > 0 and self.vb_cable_output is None: self.vb_cable_output = i
        self.mic_idx = 0
        for i, d in enumerate(devs):
            name = d['name'].lower()
            if 'cable' in name or 'vb-audio' in name: continue
            if d['max_input_channels'] > 0 and any(k in name for k in ['mic', 'микрофон', 'input', 'headset']): self.mic_idx = i; break
        self.partner_mic_idx = self.vb_cable_output
        self.speaker_idx = sd.default.device[1]
        if self.speaker_idx is not None and self.speaker_idx < len(devs):
            if 'cable' in devs[self.speaker_idx]['name'].lower() or 'vb-audio' in devs[self.speaker_idx]['name'].lower(): self.speaker_idx = None
        if self.speaker_idx is None or self.speaker_idx >= len(devs) or devs[self.speaker_idx]['max_output_channels'] == 0:
            for i, d in enumerate(devs):
                if 'cable' not in d['name'].lower() and d['max_output_channels'] >= 2: self.speaker_idx = i; break
            if self.speaker_idx is None:
                for i, d in enumerate(devs):
                    if d['max_output_channels'] > 0: self.speaker_idx = i; break

    def _stt_pro_used_vosk(self, result: Optional[Dict]) -> bool:
        """Режим Pro, но распознавание не через AITunnel (Vosk / сбой)."""
        if self.recognition_mode != "pro" or not result:
            return False
        return str(result.get("source") or "") != "aitunnel"

    def _add_message(self, speaker: str, text: str, status: str = "recognized", translated: str = "", msg_type: str = "statement", ai_enhanced: bool = False, audio_metadata: Optional[Dict] = None, audio_blob: Optional[bytes] = None, stt_pro_used_vosk: bool = False):
        with self.history_lock:
            msg_id = self.task_counter + len(self.history) + 1
            msg = {"id": msg_id, "speaker": speaker, "original": text, "translated": translated, "status": status, "timestamp": time.time(), "editable": status == "recognized" and speaker == "user", "msg_type": msg_type, "ai_enhanced": ai_enhanced}
            if stt_pro_used_vosk:
                msg["stt_pro_used_vosk"] = True
            if audio_metadata: msg["audio_metadata"] = audio_metadata
            if audio_blob and len(audio_blob) < 150 * 1024:
                try:
                    msg["audio_base64"] = base64.b64encode(audio_blob).decode('utf-8')
                    print(f"💾 Audio saved: {len(msg['audio_base64'])} chars base64", flush=True)
                except Exception as e: print(f"⚠️ Could not encode audio: {e}", flush=True)
            self.history.append(msg)
            if len(self.history) > 50: self.history.pop(0)
            return msg_id

    def skip_message(self, msg_id: int) -> bool:
        with self.history_lock:
            for msg in self.history:
                if msg["id"] == msg_id and msg["status"] == "recognized": msg["status"] = "deleted"; msg["editable"] = False; return True
        return False

    def delete_message(self, msg_id: int) -> bool:
        """Полностью убрать сообщение из истории (и из «очереди» озвучки — get_next_unvoiced его не увидит)."""
        with self.history_lock:
            n = len(self.history)
            self.history = [m for m in self.history if m.get("id") != msg_id]
            if len(self.history) < n:
                print(f"🗑️ Сообщение #{msg_id} удалено из чата и очереди озвучки", flush=True)
                return True
        return False

    # 🔥 НОВЫЙ метод для установки режима
    def set_recognition_mode(self, mode: str):
        """Установка режима распознавания: 'basic' или 'pro'"""
        if mode in ['basic', 'pro']:
            self.recognition_mode = mode
            print(f"🔧 Recognition mode set to: {mode}", flush=True)
            return True
        return False

    def set_conversation_languages(self, user_lang: str, partner_lang: str):
        self.user_language = (user_lang or "ru").lower()
        self.partner_language = (partner_lang or "en").lower()
        print(f"🌐 Conversation languages updated: user={self.user_language}, partner={self.partner_language}", flush=True)
        return True

    def export_history_for_archive(self) -> List[Dict[str, Any]]:
        """Копия истории чата для сохранения в БД (без base64 аудио)."""
        with self.history_lock:
            out: List[Dict[str, Any]] = []
            for m in self.history:
                row: Dict[str, Any] = {}
                for k, v in m.items():
                    if k == "audio_base64":
                        continue
                    if k == "audio_metadata" and v is not None:
                        try:
                            row[k] = json.loads(json.dumps(v, default=str))
                        except Exception:
                            row[k] = str(v)[:500]
                    else:
                        try:
                            json.dumps(v, default=str)
                            row[k] = v
                        except TypeError:
                            row[k] = str(v)
                out.append(row)
            return out

    def _build_recognizer_for_lang(self, lang_code: str):
        rec = _vosk_build_recognizer(lang_code)
        return rec if rec is not None else self.partner_rec

    # 🔥 НОВАЯ функция: Воркер очереди распознавания
    async def _recognition_worker(self):
        """Фоновая задача для обработки очереди распознавания"""
        print("🔧 Recognition worker started", flush=True)
        
        while self.running:
            try:
                # 🔥 Ждём задачу из очереди с таймаутом
                task = await asyncio.wait_for(self.recognition_queue.get(), timeout=1.0)
                
                if task is None:  # 🔥 Сигнал остановки
                    print("🔧 Recognition worker stopping (None received)", flush=True)
                    break
                
                task_id, audio_data, source = task  # source: 'user' или 'partner'
                print(f"🔧 Processing task #{task_id} from queue (size: {self.recognition_queue.qsize()})", flush=True)
                
                # 🔥 Распознавание в зависимости от источника
                if source == 'user':
                    try:
                        await self._process_user_phrase(audio_data, task_id)
                    finally:
                        try:
                            self._user_stt_semaphore.release()
                        except ValueError:
                            pass
                elif source == 'partner':
                    await self._process_partner_phrase_internal(audio_data, task_id)
                
                self.recognition_queue.task_done()
                
            except asyncio.TimeoutError:
                # 🔥 Нормально: очередь пуста, продолжаем цикл
                continue
            except Exception as e:
                print(f"❌ Recognition worker error: {type(e).__name__}: {e}", flush=True)
                traceback.print_exc()
        
        print("🔧 Recognition worker stopped", flush=True)

    def _drain_recognition_queue(self) -> None:
        """Убрать из очереди ожидающие фразы (после стопа они не нужны)."""
        n = 0
        while True:
            try:
                self.recognition_queue.get_nowait()
            except asyncio.QueueEmpty:
                break
            try:
                self.recognition_queue.task_done()
            except ValueError:
                pass
            n += 1
        if n:
            print(f"🔧 Сброшено из очереди распознавания: {n} задач(и)", flush=True)

    async def _process_user_phrase(self, audio_data: np.ndarray, task_id: int):
        """Обработка фразы пользователя (вынесено из _vad_callback)"""
        text_ru = ""
        result = {"text": "", "alternatives": [], "confidence": None, "source": "unknown"}
        source_lang = (self.user_language or "ru").lower()
        target_lang = (self.partner_language or "en").lower()
        
        # 🔥 Отладочный лог
        print(f"🔧 DEBUG VAD: recognition_mode='{self.recognition_mode}', AITUNNEL_READY={AITUNNEL_READY}, main_loop={self.main_loop is not None}", flush=True)
        
        # 🔥 Pro-режим: пробуем AITunnel с ТОЛЬКО gpt-4o-mini-transcribe
        if self.recognition_mode == 'pro' and AITUNNEL_READY:
            print(f"🤖 Pro-режим: пытаемся распознать через AITunnel/{AITUNNEL_TRANSCRIBE_MODEL} (task #{task_id})...", flush=True)
            
            try:
                aitunnel_result = await transcribe_with_aitunnel(audio_data, source_lang, self.ai_topic or "")
                
                if aitunnel_result and aitunnel_result.get("text"):
                    text_ru = aitunnel_result["text"]
                    result = aitunnel_result
                    result["source"] = "aitunnel"
                    print(f"🤖 Pro-режим: ✅ распознано через AITunnel/{AITUNNEL_TRANSCRIBE_MODEL} (task #{task_id}): '{text_ru}'", flush=True)
                else:
                    print(f"⚠️ Pro-режим: ⚠️ AITunnel вернул пустой результат — fallback на Vosk (task #{task_id})", flush=True)
                    recognizer = self._build_recognizer_for_lang(source_lang)
                    result = transcribe_audio_with_alternatives(audio_data, recognizer)
                    text_ru = result["text"]
                    result["source"] = "vosk-fallback"
                    
            except Exception as e:
                print(f"⚠️ Pro-режим: ❌ Ошибка AITunnel (task #{task_id}): {type(e).__name__}: {e} — fallback на Vosk", flush=True)
                recognizer = self._build_recognizer_for_lang(source_lang)
                result = transcribe_audio_with_alternatives(audio_data, recognizer)
                text_ru = result["text"]
                result["source"] = "vosk-error"
        else:
            # 🔥 Basic-режим: сразу Vosk
            mode_label = "Basic-режим" if self.recognition_mode == 'basic' else f"Pro-режим (AITUNNEL_READY={AITUNNEL_READY})"
            print(f"🔹 {mode_label}: используем Vosk (task #{task_id})", flush=True)
            recognizer = self._build_recognizer_for_lang(source_lang)
            result = transcribe_audio_with_alternatives(audio_data, recognizer)
            text_ru = result["text"]
            result["source"] = "vosk"
        
        # 🔥 Логируем результат
        print(f"🔍 VAD: распознано '{text_ru}' (длина={len(text_ru)}, альтернативы: {len(result.get('alternatives', []))}, источник: {result.get('source', 'unknown')}, task #{task_id})", flush=True)
        
        # 🔥 Добавляем в историю если текст не пустой
        if len(text_ru) >= 2:
            print(f"🎤 (You RU): '{text_ru}' (task #{task_id})", flush=True)
            text_en, _ = fast_translate_sync(text_ru, target_lang)
            print(f"📝 _add_message: speaker=user, text='{text_ru}', translated='{text_en}'", flush=True)
            
            # 🔥 Конвертируем аудио в WAV bytes
            wav_buffer = io.BytesIO()
            sf.write(wav_buffer, audio_data, SAMPLE_RATE, format='WAV')
            audio_bytes = wav_buffer.getvalue()
            
            self._add_message(
                "user",
                text_ru,
                "recognized",
                translated=text_en,
                ai_enhanced=False,
                audio_metadata=result,
                audio_blob=audio_bytes,
                stt_pro_used_vosk=self._stt_pro_used_vosk(result),
            )
            print(f"📚 История: {len(self.history)} сообщений (task #{task_id})", flush=True)

    async def _process_partner_phrase_internal(self, audio_data: np.ndarray, task_id: int):
        """Внутренняя обработка фразы партнёра (для очереди)"""
        result = None
        source_lang = (self.partner_language or "en").lower()
        target_lang = (self.user_language or "ru").lower()
        
        # 🔥 Pro-режим: пробуем AITunnel с ТОЛЬКО gpt-4o-mini-transcribe
        if self.recognition_mode == 'pro' and AITUNNEL_READY:
            print(f"🤖 Partner Pro-режим: пытаемся распознать через AITunnel/{AITUNNEL_TRANSCRIBE_MODEL} (task #{task_id})...", flush=True)
            
            try:
                aitunnel_result = await transcribe_with_aitunnel(audio_data, source_lang, self.ai_topic or "")
                
                if aitunnel_result and aitunnel_result.get("text"):
                    result = aitunnel_result
                    result["source"] = "aitunnel"
                    print(f"🤖 Partner Pro-режим: ✅ распознано через AITunnel/{AITUNNEL_TRANSCRIBE_MODEL} (task #{task_id}): '{result['text']}'", flush=True)
                else:
                    print(f"⚠️ Partner Pro-режим: ⚠️ AITunnel вернул пустой результат — fallback на Vosk (task #{task_id})", flush=True)
            except Exception as e:
                print(f"⚠️ Partner Pro-режим: ❌ Ошибка AITunnel (task #{task_id}): {type(e).__name__}: {e} — fallback на Vosk", flush=True)
        
        # 🔥 Fallback на Vosk
        if not result or not result.get("text"):
            if self.recognition_mode == 'basic':
                print(f"🔹 Partner Basic-режим: используем Vosk (task #{task_id})", flush=True)
            else:
                print(f"⚠️ Partner Pro-режим: fallback на Vosk (task #{task_id})", flush=True)
            
            recognizer = self._build_recognizer_for_lang(source_lang)
            result = transcribe_audio_with_alternatives(audio_data, recognizer)
            result["source"] = "vosk" if self.recognition_mode == 'basic' else "vosk-fallback"
        
        text = result["text"]
        
        # 🔥 Логируем результат
        print(f"🔍 Partner VAD: распознано '{text}' (длина={len(text)}, источник: {result.get('source', 'unknown')}, task #{task_id})", flush=True)
        
        if text and len(text) >= 2:
            print(f"🔍 (Partner EN): '{text}' (task #{task_id})", flush=True)
            text_ru, _ = fast_translate_sync(text, target_lang)
            self._add_message(
                "partner",
                text,
                "recognized",
                translated=text_ru,
                msg_type="statement",
                audio_metadata=result,
                stt_pro_used_vosk=self._stt_pro_used_vosk(result),
            )

    async def _process_partner_phrase(self, audio_data: np.ndarray):
        """Публичный метод для партнёра — кладёт задачу в очередь"""
        source_lang = (self.partner_language or "en").lower()
        target_lang = (self.user_language or "ru").lower()
        # 🔥 Создаём уникальный ID задачи
        task_id = self.task_counter
        self.task_counter += 1
        
        # 🔥 Копируем аудио для безопасности
        audio_copy = audio_data.copy()
        
        # 🔥 Пытаемся положить в очередь
        try:
            await asyncio.wait_for(
                self.recognition_queue.put((task_id, audio_copy, 'partner')),
                timeout=2.0  # 🔥 Таймаут на добавление в очередь
            )
            print(f"🔧 Partner phrase queued: task #{task_id} (queue size: {self.recognition_queue.qsize()})", flush=True)
        except asyncio.TimeoutError:
            print(f"⚠️ Partner queue full, falling back to sync Vosk (task #{task_id})", flush=True)
            # 🔥 Fallback: синхронная обработка через Vosk если очередь переполнена
            recognizer = self._build_recognizer_for_lang(source_lang)
            result = transcribe_audio_with_alternatives(audio_data, recognizer)
            text = result["text"]
            if text and len(text) >= 2:
                text_ru, _ = fast_translate_sync(text, target_lang)
                self._add_message(
                    "partner",
                    text,
                    "recognized",
                    translated=text_ru,
                    msg_type="statement",
                    audio_metadata=result,
                    stt_pro_used_vosk=self._stt_pro_used_vosk(result),
                )

    def _partner_vad_callback(self, indata, frames, time_info, status):
        """
        Колбэк для обработки аудио партнёра (EN).
        🔥 Детектирует речь и кладёт в очередь — не блокируется на распознавании!
        """
        if not self.running:
            return
        if time.time() - self.last_user_speak_time < self.partner_mute_duration: 
            return
        
        rms = np.sqrt(np.mean(indata**2))
        
        # 🔥 Детекция начала речи
        if rms > self.mic_rms_threshold * 0.6:
            if not self.partner_speaking: 
                self.partner_speaking = True
                self.partner_buffer = []
                self.partner_silence_time = 0.0
            self.partner_buffer.append(indata.copy())
            self.partner_silence_time = 0.0
        else:
            # 🔥 Детекция конца речи
            if self.partner_speaking:
                self.partner_silence_time += self.partner_vad_chunk
                self.partner_buffer.append(indata.copy())
                
                if self.partner_silence_time >= self.partner_silence_timeout:
                    # 🔥 Фраза завершена — кладём в очередь
                    audio_data = np.concatenate(self.partner_buffer, axis=0).flatten()
                    if self.translation_paused:
                        print("⏸️ translation_paused: фраза партнёра не отправлена на распознавание", flush=True)
                        self.partner_speaking = False
                        self.partner_buffer = []
                        self.partner_silence_time = 0.0
                        return
                    # 🔥 Создаём уникальный ID задачи
                    task_id = self.task_counter
                    self.task_counter += 1
                    
                    # 🔥 Копируем аудио для безопасности
                    audio_copy = audio_data.copy()
                    
                    # 🔥 Пытаемся положить в очередь
                    if self.main_loop and self.running:
                        try:
                            asyncio.run_coroutine_threadsafe(
                                self.recognition_queue.put((task_id, audio_copy, 'partner')),
                                self.main_loop
                            )
                            print(f"🔧 Partner phrase queued: task #{task_id} (queue size: {self.recognition_queue.qsize()})", flush=True)
                        except Exception as e:
                            print(f"⚠️ Failed to queue partner task #{task_id}: {e} — falling back to sync Vosk", flush=True)
                            # 🔥 Fallback: синхронная обработка через Vosk
                            source_lang = (self.partner_language or "en").lower()
                            target_lang = (self.user_language or "ru").lower()
                            recognizer = self._build_recognizer_for_lang(source_lang)
                            result = transcribe_audio_with_alternatives(audio_data, recognizer)
                            text = result["text"]
                            if text and len(text) >= 2:
                                text_ru, _ = fast_translate_sync(text, target_lang)
                                self._add_message(
                                    "partner",
                                    text,
                                    "recognized",
                                    translated=text_ru,
                                    msg_type="statement",
                                    audio_metadata=result,
                                    stt_pro_used_vosk=self._stt_pro_used_vosk(result),
                                )
                    else:
                        # 🔥 Нет event loop — fallback на синхронный Vosk
                        print(f"⚠️ No main loop for partner, using sync Vosk (task #{task_id})", flush=True)
                        source_lang = (self.partner_language or "en").lower()
                        target_lang = (self.user_language or "ru").lower()
                        recognizer = self._build_recognizer_for_lang(source_lang)
                        result = transcribe_audio_with_alternatives(audio_data, recognizer)
                        text = result["text"]
                        if text and len(text) >= 2:
                            text_ru, _ = fast_translate_sync(text, target_lang)
                            self._add_message(
                                "partner",
                                text,
                                "recognized",
                                translated=text_ru,
                                msg_type="statement",
                                audio_metadata=result,
                                stt_pro_used_vosk=self._stt_pro_used_vosk(result),
                            )
                    
                    # 🔥 Сбрасываем буфер
                    self.partner_speaking = False
                    self.partner_buffer = []
                    self.partner_silence_time = 0.0
                    print(f"🔧 Partner buffer reset, ready for next phrase (task #{task_id} in queue)", flush=True)

    def _vad_callback(self, indata, frames, time_info, status):
        """
        Колбэк для обработки аудио с микрофона (VAD + очередь).
        🔥 Теперь только детектирует речь и кладёт в очередь — не блокируется на распознавании!
        """
        if self.unmute_mode: 
            return
        if not self.running:
            return
        if time.time() < self.user_mic_suppress_until:
            return
        
        rms = np.sqrt(np.mean(indata**2))
        peak = float(np.max(np.abs(indata))) if indata.size else 0.0
        self.last_mic_rms = rms
        self.last_mic_peak = peak
        
        # 🔥 Детекция начала речи
        if rms > self.mic_rms_threshold:
            if not self.speaking: 
                self.speaking = True
                self.buffer = []
                self.silence_time = 0.0
            self.buffer.append(indata.copy())
            self.silence_time = 0.0
            
        # 🔥 Детекция конца речи
        else:
            if self.speaking:
                self.silence_time += VAD_CHUNK
                self.buffer.append(indata.copy())
                
                if self.silence_time >= self.phrase_silence_sec:
                    # 🔥 Фраза завершена — кладём в очередь (не обрабатываем сразу!)
                    audio_data = np.concatenate(self.buffer, axis=0).flatten()
                    if self.translation_paused:
                        print("⏸️ translation_paused: фраза пользователя не отправлена на распознавание", flush=True)
                        self.speaking = False
                        self.buffer = []
                        self.silence_time = 0.0
                        return
                    if not self._user_stt_semaphore.acquire(blocking=False):
                        print("⏭️ user VAD: предыдущая фраза ещё в STT — не ставим в очередь (хвост/шум)", flush=True)
                        self.speaking = False
                        self.buffer = []
                        self.silence_time = 0.0
                        return
                    # 🔥 Создаём уникальный ID задачи
                    task_id = self.task_counter
                    self.task_counter += 1
                    
                    # 🔥 Копируем аудио для безопасности
                    audio_copy = audio_data.copy()
                    
                    # 🔥 Пытаемся положить в очередь
                    if self.main_loop and self.running:
                        try:
                            # 🔥 Используем call_soon_threadsafe для безопасного добавления в asyncio.Queue
                            asyncio.run_coroutine_threadsafe(
                                self.recognition_queue.put((task_id, audio_copy, 'user')),
                                self.main_loop
                            )
                            print(f"🔧 User phrase queued: task #{task_id} (queue size: {self.recognition_queue.qsize()})", flush=True)
                        except Exception as e:
                            print(f"⚠️ Failed to queue task #{task_id}: {e} — falling back to sync Vosk", flush=True)
                            try:
                                self._user_stt_semaphore.release()
                            except ValueError:
                                pass
                            # 🔥 Fallback: синхронная обработка через Vosk если очередь недоступна
                            source_lang = (self.user_language or "ru").lower()
                            target_lang = (self.partner_language or "en").lower()
                            recognizer = self._build_recognizer_for_lang(source_lang)
                            result = transcribe_audio_with_alternatives(audio_data, recognizer)
                            text_ru = result["text"]
                            if len(text_ru) >= 2:
                                text_en, _ = fast_translate_sync(text_ru, target_lang)
                                wav_buffer = io.BytesIO()
                                sf.write(wav_buffer, audio_data, SAMPLE_RATE, format='WAV')
                                audio_bytes = wav_buffer.getvalue()
                                self._add_message(
                                    "user",
                                    text_ru,
                                    "recognized",
                                    translated=text_en,
                                    ai_enhanced=False,
                                    audio_metadata=result,
                                    audio_blob=audio_bytes,
                                    stt_pro_used_vosk=self._stt_pro_used_vosk(result),
                                )
                    else:
                        # 🔥 Нет event loop — fallback на синхронный Vosk
                        print(f"⚠️ No main loop, using sync Vosk (task #{task_id})", flush=True)
                        try:
                            source_lang = (self.user_language or "ru").lower()
                            target_lang = (self.partner_language or "en").lower()
                            recognizer = self._build_recognizer_for_lang(source_lang)
                            result = transcribe_audio_with_alternatives(audio_data, recognizer)
                            text_ru = result["text"]
                            if len(text_ru) >= 2:
                                text_en, _ = fast_translate_sync(text_ru, target_lang)
                                wav_buffer = io.BytesIO()
                                sf.write(wav_buffer, audio_data, SAMPLE_RATE, format='WAV')
                                audio_bytes = wav_buffer.getvalue()
                                self._add_message(
                                    "user",
                                    text_ru,
                                    "recognized",
                                    translated=text_en,
                                    ai_enhanced=False,
                                    audio_metadata=result,
                                    audio_blob=audio_bytes,
                                    stt_pro_used_vosk=self._stt_pro_used_vosk(result),
                                )
                        finally:
                            try:
                                self._user_stt_semaphore.release()
                            except ValueError:
                                pass
                    
                    # 🔥 Сбрасываем буфер для следующей фразы (сразу, не ждём обработки!)
                    self.speaking = False
                    self.buffer = []
                    self.silence_time = 0.0
                    print(f"🔧 Buffer reset, ready for next phrase (task #{task_id} in queue)", flush=True)

    async def start(self):
        if self.running: return
        self.running = True
        self.main_loop = asyncio.get_running_loop()
        
        try:
            # 🔥 Запустить воркера распознавания
            self.worker_task = asyncio.create_task(self._recognition_worker())
            print("🔧 Recognition worker task created", flush=True)
            
            # 🔥 Запустить аудио потоки
            if not self.unmute_mode:
                self.stream = sd.InputStream(device=self.mic_idx, samplerate=SAMPLE_RATE, channels=1, dtype='float32', blocksize=int(SAMPLE_RATE * VAD_CHUNK), callback=self._vad_callback)
                self.stream.start()
            if self.partner_mic_idx is not None and self.partner_mic_idx != self.mic_idx:
                self.partner_stream = sd.InputStream(device=self.partner_mic_idx, samplerate=SAMPLE_RATE, channels=1, dtype='float32', blocksize=int(SAMPLE_RATE * self.partner_vad_chunk), callback=self._partner_vad_callback)
                self.partner_stream.start()
            
            print("✅ Аудио-движок запущен", flush=True)
        except Exception as e: 
            print(f"❌ Ошибка запуска: {e}", flush=True)
            self.running = False
            raise

    async def stop(self):
        if not self.running: return
        self.running = False
        self.translation_paused = False
        self.last_mic_rms = 0.0
        self.last_mic_peak = 0.0
        self.speaking = False
        self.buffer = []
        self.silence_time = 0.0
        self.partner_speaking = False
        self.partner_buffer = []
        self.partner_silence_time = 0.0

        # Сначала глушим микрофоны — новые фразы не попадают в очередь
        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception as e:
                print(f"⚠️ stream.stop: {e}", flush=True)
            self.stream = None
        if self.partner_stream:
            try:
                self.partner_stream.stop()
                self.partner_stream.close()
            except Exception as e:
                print(f"⚠️ partner_stream.stop: {e}", flush=True)
            self.partner_stream = None

        # Воркер мог висеть на AITunnel/Vosk до 5+ с — отменяем задачу, ответ стопа не ждём распознавания
        if self.worker_task and not self.worker_task.done():
            print("🔧 Остановка воркера распознавания (cancel)...", flush=True)
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
            except Exception as e:
                print(f"⚠️ recognition worker join: {e}", flush=True)
        self.worker_task = None

        self._drain_recognition_queue()
        self.recognition_queue = asyncio.Queue(maxsize=10)
        self._user_stt_semaphore = threading.Semaphore(1)

        save_cache()
        print("✅ Аудио-движок остановлен", flush=True)

    def set_conference_mode(self, enabled: bool):
        try: self.conference_mode = enabled; return True
        except Exception as e: traceback.print_exc(); raise

    def set_phrase_silence_sec(self, seconds: float) -> float:
        """Пауза тишины до конца фразы (микрофон и канал партнёра), сек."""
        v = float(seconds)
        v = min(PHRASE_SILENCE_MAX_SEC, max(PHRASE_SILENCE_MIN_SEC, v))
        self.phrase_silence_sec = round(v, 2)
        self.partner_silence_timeout = self.phrase_silence_sec
        print(f"🔧 phrase_silence_sec={self.phrase_silence_sec} (VAD user+partner)", flush=True)
        return self.phrase_silence_sec

    def set_mic_rms_threshold(self, value: float) -> float:
        """Порог RMS для начала фразы (ниже — чувствительнее к тихой речи)."""
        v = float(value)
        v = min(MIC_RMS_THRESHOLD_MAX, max(MIC_RMS_THRESHOLD_MIN, v))
        self.mic_rms_threshold = round(v, 6)
        print(f"🔧 mic_rms_threshold={self.mic_rms_threshold} (VAD)", flush=True)
        return self.mic_rms_threshold

    def set_translation_paused(self, enabled: bool):
        self.translation_paused = bool(enabled)
        if self.translation_paused:
            self.speaking = False
            self.buffer = []
            self.silence_time = 0.0
            self.partner_speaking = False
            self.partner_buffer = []
            self.partner_silence_time = 0.0
        print(f"⏸️ translation_paused={self.translation_paused}", flush=True)
        return True

    def _mic_level_hint(self) -> str:
        if not self.running or self.unmute_mode:
            return "idle"
        if self.last_mic_peak >= 0.97:
            return "clip"
        if self.last_mic_rms < self.mic_rms_threshold * 0.35:
            return "quiet"
        return "ok"

    def get_status(self):
        return {
            "running": self.running, "listening": self.speaking, 
            "queue_size": self.task_queue.qsize(), 
            "recognition_queue_size": self.recognition_queue.qsize(),  # 🔥 НОВОЕ
            "task_counter": self.task_counter, "conference_mode": self.conference_mode, 
            "unmute_mode": self.unmute_mode, "ai_enabled": self.ai_enabled, "ai_topic": self.ai_topic, 
            "mic_device": f"IDX:{self.mic_idx}", "speaker_device": f"IDX:{self.speaker_idx}", 
            "output_mode": "conference" if self.conference_mode else "local",
            "recognition_mode": self.recognition_mode,
            "user_language": self.user_language,
            "partner_language": self.partner_language,
            "pro_model": AITUNNEL_TRANSCRIBE_MODEL if AITUNNEL_READY else None,  # 🔥 НОВОЕ: какая модель в Pro
            "translation_paused": self.translation_paused,
            "mic_rms": round(float(self.last_mic_rms), 6),
            "mic_peak": round(float(self.last_mic_peak), 6),
            "mic_level_hint": self._mic_level_hint(),
            "phrase_silence_sec": self.phrase_silence_sec,
            "phrase_silence_min": PHRASE_SILENCE_MIN_SEC,
            "phrase_silence_max": PHRASE_SILENCE_MAX_SEC,
            "mic_rms_threshold": self.mic_rms_threshold,
            "mic_rms_threshold_min": MIC_RMS_THRESHOLD_MIN,
            "mic_rms_threshold_max": MIC_RMS_THRESHOLD_MAX,
        }
    
    def get_chat_history(self):
        with self.history_lock:
            history = list(reversed(self.history))
            for msg in history:
                if "audio_base64" in msg:
                    if len(msg["audio_base64"]) > 150000:
                        print(f"⚠️ Audio слишком большой ({len(msg['audio_base64'])} chars), удаляем", flush=True)
                        del msg["audio_base64"]
            return history
    
    def get_next_unvoiced(self) -> Optional[dict]:
        with self.history_lock:
            for msg in self.history:
                if msg["status"] == "recognized" and msg["editable"]: return msg.copy()
        return None

    async def voice_message(self, msg_id: int, custom_text: Optional[str] = None, msg_type: str = "statement", voice_override: str = None, user_id: str = "anonymous", clone_via_modal: bool = False) -> dict:
        async with self._voice_play_lock:
            suppress_user_mic = False
            try:
                with self.history_lock:
                    msg = next((m for m in self.history if m["id"] == msg_id), None)
                    if not msg: return {"error": "Message not found"}
                    if msg["status"] != "recognized": return {"status": "already_processed"}
                    msg["status"] = "playing"; msg["msg_type"] = msg_type; text_to_translate = custom_text if custom_text is not None else msg["original"]; msg["original"] = text_to_translate
                if msg.get("speaker") == "user":
                    suppress_user_mic = True
                    self.user_mic_suppress_until = time.time() + 900.0
                stripped = text_to_translate.strip()
                if not stripped.endswith(('.', '!', '?')): text_to_translate = stripped + ("?" if msg_type == "question" else ".")
                target_lang = self.partner_language if msg["speaker"] == "user" else self.user_language
                voice = voice_override if voice_override else (TTS_VOICE if msg["speaker"] == "user" else PARTNER_TTS_VOICE)
                text_translated, _ = fast_translate_sync(text_to_translate, target_lang); msg["translated"] = text_translated
                samples, rate_out = None, None
                print(f"🔊 voice_message: voice={voice}, is_cloned={voice and voice.startswith('cloned:')}", flush=True)
                if voice and voice.startswith("cloned:"):
                    voice_id = voice.replace("cloned:", "")
                    print(f"🔊 voice_message: клонированный голос, voice_id={voice_id}, user_id={user_id}", flush=True)
                    audio_bytes = await generate_cloned_audio(text_translated, voice_id, user_id, use_modal=clone_via_modal)
                    if audio_bytes:
                        print(f"🔊 voice_message: аудио клонированного голоса сгенерировано, длина={len(audio_bytes)} байт", flush=True)
                        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                            tmp.write(audio_bytes); tmp_path = tmp.name
                        try:
                            data, rate_out = sf.read(tmp_path); samples = data.astype(np.float32)
                        finally:
                            if os.path.exists(tmp_path): os.remove(tmp_path)
                    else:
                        print(f"⚠️ voice_message: generate_cloned_audio вернул None, fallback к стандартному TTS", flush=True)
                        for rate in SUPPORTED_SAMPLE_RATES:
                            samples, rate_out, _ = await speak_text(text_translated, voice=TTS_VOICE, preferred_rate=rate)
                            if samples is not None: break
                else:
                    print(f"🔊 voice_message: стандартный голос {voice}", flush=True)
                    for rate in SUPPORTED_SAMPLE_RATES:
                        samples, rate_out, _ = await speak_text(text_translated, voice=voice, preferred_rate=rate)
                        if samples is not None: break
                if samples is None:
                    with self.history_lock: msg["status"] = "error: TTS failed"
                    return {"error": "TTS failed"}
                try:
                    play_dev = self.speaker_idx
                    if self.conference_mode and self.vb_cable_input is not None: play_dev = self.vb_cable_input
                    print(f"🔊 voice_message: воспроизведение, rate={rate_out}, device={play_dev}", flush=True)
                    await asyncio.to_thread(_sd_play_blocking, samples, int(rate_out), play_dev)
                    self.last_user_speak_time = time.time()
                    duration_minutes = float(len(samples) / rate_out / 60.0) if rate_out else 0.0
                    record_user_activity(
                        user_id=user_id,
                        action_type="voice_message",
                        phrases_delta=1,
                        minutes_delta=duration_minutes,
                        chars_count=len(text_to_translate or ""),
                        voice_mode="cloned" if voice and voice.startswith("cloned:") else "standard",
                        voice_name=voice
                    )
                    with self.history_lock: msg["status"] = "done"; msg["editable"] = False
                    return {"status": "played", "translated": text_translated, "type": msg_type}
                except Exception as e:
                    with self.history_lock: msg["status"] = f"error: {str(e)}"
                    return {"error": str(e)}
            finally:
                if suppress_user_mic:
                    self.user_mic_suppress_until = 0.0

# ================= 🏗️ FASTAPI =================
def _is_benign_client_disconnect(exc: BaseException) -> bool:
    """Обрыв TCP клиентом: на Windows Proactor часто ConnectionResetError 10054."""
    if isinstance(exc, (BrokenPipeError, ConnectionAbortedError, ConnectionResetError)):
        return True
    if isinstance(exc, OSError):
        if getattr(exc, "winerror", None) == 10054:
            return True
        if getattr(exc, "errno", None) in (104, 32):  # reset / broken pipe (Unix)
            return True
    return False


@asynccontextmanager
async def _app_lifespan(app: FastAPI):
    if sys.platform == "win32":
        loop = asyncio.get_running_loop()
        prev = loop.get_exception_handler()

        def _handler(l, context):
            exc = context.get("exception")
            if exc is not None and _is_benign_client_disconnect(exc):
                return
            if prev:
                prev(l, context)
            else:
                l.default_exception_handler(context)

        loop.set_exception_handler(_handler)
    yield


app = FastAPI(title="🎙️ Hybrid Translator Chat API", version="60.0.0", lifespan=_app_lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
engine = AudioEngine()

# ================= 🔐 AUTH MODELS =================
class ControlRequest(BaseModel): action: str
class ConferenceModeRequest(BaseModel): enabled: bool
class TranslationPauseRequest(BaseModel): paused: bool
class PhraseSilenceRequest(BaseModel): seconds: float
class MicRmsThresholdRequest(BaseModel): threshold: float
class UnmuteModeRequest(BaseModel): enabled: bool
class AIConfigRequest(BaseModel): enabled: bool; topic: str = ""
class TTSRequest(BaseModel): text: str; voice: str = TTS_VOICE; lang: str = "en-US"; play_locally: bool = True; clone_via_modal: Optional[bool] = False
class VoiceRequest(BaseModel): msg_id: Optional[int] = None; text: Optional[str] = None; msg_type: Optional[str] = "statement"; voice: Optional[str] = None; clone_via_modal: Optional[bool] = False
class DeleteRequest(BaseModel): msg_id: int
class ResetRequest(BaseModel): pass
class VoicePreviewRequest(BaseModel): voice: str; text: Optional[str] = "Hello. Test."; clone_via_modal: Optional[bool] = False
class TrialCreateBody(BaseModel):
    topic: str = "business"
    settings: Dict[str, Any] = {}
    clone_voice_id: Optional[str] = None


class TrialTurnBody(BaseModel):
    session_id: str
    user_text: str
    partner_edge_voice: Optional[str] = None


class TrialReplyHintsBody(BaseModel):
    session_id: str
    partner_phrase: str = ""


class TrialSttSuggestionsBody(BaseModel):
    session_id: str
    text: str


class StatusResponse(BaseModel): running: bool; listening: bool; queue_size: int; task_counter: int; conference_mode: bool; unmute_mode: bool; ai_enabled: bool; ai_topic: str; mic_device: str; speaker_device: str; output_mode: str

# 🔐 AUTH REQUEST MODELS
class RegisterRequest(BaseModel): name: str; email: str; password: str
class LoginRequest(BaseModel): email: str; password: str
class SubscriptionPurchaseRequest(BaseModel): planName: str
class ConversationSettingsRequest(BaseModel):
    ai_conversation_description: str = ""
    phrase_silence_sec: Optional[float] = None

# 🔥 ОБНОВЛЕНО: Модель для аудио данных
class AudioData(BaseModel):
    format: str = "wav"
    sample_rate: int = 16000
    channels: int = 1
    data: str

class AudioMetadata(BaseModel):
    alternatives: Optional[List[str]] = []
    confidence: Optional[float] = None
    duration: Optional[float] = None

class SuggestionsRequest(BaseModel):
    text: str
    msg_id: Optional[int] = None
    msg_type: Optional[str] = "general"
    topic: Optional[str] = None
    audio_metadata: Optional[AudioMetadata] = None
    audio_data: Optional[AudioData] = None

# 🔥 НОВАЯ модель для режима распознавания
class RecognitionModeRequest(BaseModel):
    mode: str  # "basic" или "pro"

class ConversationLanguagesRequest(BaseModel):
    user_lang: str
    partner_lang: str

class UserStatsUpdateRequest(BaseModel):
    minutesUsed: float = 0.0
    phrasesTranslated: int = 0
    charsCount: int = 0


class StripeCreateRequest(BaseModel):
    amount: float
    currency: str = "USD"

# ================= 🔐 DATABASE FUNCTIONS =================
def get_db_connection():
    db_path = os.path.join(BASE_DIR, "..", "database.db")
    conn = sqlite3.connect(db_path); conn.row_factory = sqlite3.Row
    return conn

def _ensure_users_created_at_column(conn):
    cols = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
    if cols and "created_at" not in cols:
        try:
            conn.execute("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            conn.execute("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")
            print("✅ Колонка users.created_at добавлена (миграция)", flush=True)
        except Exception as e:
            print(f"⚠️ users.created_at migration: {e}", flush=True)

def _ensure_users_subscription_columns(conn):
    cols = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
    if not cols:
        return
    for col, ddl in (
        ("balance", "ALTER TABLE users ADD COLUMN balance REAL NOT NULL DEFAULT 0"),
        ("subscription_level", "ALTER TABLE users ADD COLUMN subscription_level TEXT"),
        ("subscription_expires", "ALTER TABLE users ADD COLUMN subscription_expires TEXT"),
    ):
        if col not in cols:
            try:
                conn.execute(ddl)
                print(f"✅ Колонка users.{col} добавлена (миграция)", flush=True)
            except Exception as e:
                print(f"⚠️ users.{col} migration: {e}", flush=True)

def _ensure_users_ai_conversation_description(conn):
    cols = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
    if not cols or "ai_conversation_description" in cols:
        return
    try:
        conn.execute("ALTER TABLE users ADD COLUMN ai_conversation_description TEXT")
        print("✅ Колонка users.ai_conversation_description добавлена (миграция)", flush=True)
    except Exception as e:
        print(f"⚠️ users.ai_conversation_description migration: {e}", flush=True)


def _ensure_users_phrase_silence_sec(conn):
    cols = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
    if not cols or "phrase_silence_sec" in cols:
        return
    try:
        conn.execute("ALTER TABLE users ADD COLUMN phrase_silence_sec REAL")
        print("✅ Колонка users.phrase_silence_sec добавлена (миграция)", flush=True)
    except Exception as e:
        print(f"⚠️ users.phrase_silence_sec migration: {e}", flush=True)


def init_auth_db():
    try:
        conn = get_db_connection()
        conn.execute('''CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, username TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
        _ensure_users_created_at_column(conn)
        _ensure_users_subscription_columns(conn)
        _ensure_users_ai_conversation_description(conn)
        _ensure_users_phrase_silence_sec(conn)
        conn.execute('''CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        conn.execute('''CREATE TABLE IF NOT EXISTS user_activity_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            action_type TEXT NOT NULL,
            phrases_delta INTEGER NOT NULL DEFAULT 0,
            minutes_delta REAL NOT NULL DEFAULT 0,
            chars_count INTEGER NOT NULL DEFAULT 0,
            voice_mode TEXT,
            voice_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        conn.execute('''CREATE INDEX IF NOT EXISTS idx_user_activity_user_time ON user_activity_events (user_id, created_at DESC)''')
        conn.execute('''CREATE TABLE IF NOT EXISTS conversation_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            title TEXT,
            message_count INTEGER NOT NULL DEFAULT 0,
            messages_json TEXT NOT NULL
        )''')
        conn.execute('''CREATE INDEX IF NOT EXISTS idx_conversation_user_time ON conversation_sessions (user_id, created_at DESC)''')
        conn.commit(); conn.close()
        print("✅ Таблицы users/user_activity_events/conversation_sessions инициализированы", flush=True)
    except Exception as e: print(f"⚠️ DB init warning: {e}", flush=True)

init_auth_db()

# --- Тарифы: лимиты минут и цены (USD, как на дашборде) ---
SUBSCRIPTION_PLAN_MINUTES = {"free": 60, "pro": 500, "team": 9999, "business": 9999}
SUBSCRIPTION_PLAN_PRICES_USD = {"pro": 19.99, "team": 49.99, "business": 49.99}
SUBSCRIPTION_PERIOD_DAYS = 30

def _db_row_get(row: Optional[sqlite3.Row], key: str, default=None):
    if row is None:
        return default
    try:
        return row[key]
    except (KeyError, IndexError, TypeError):
        return default

def _subscription_expires_after(conn, start_ts: Optional[str], days: int = SUBSCRIPTION_PERIOD_DAYS) -> Optional[str]:
    if not start_ts:
        return None
    try:
        r = conn.execute(f"SELECT datetime(?, '+{int(days)} days')", (str(start_ts),)).fetchone()
        return r[0] if r else None
    except Exception:
        return None

def _subscription_is_past(conn, expires_at: Optional[str]) -> bool:
    if not expires_at:
        return False
    try:
        r = conn.execute("SELECT datetime('now') > datetime(?)", (str(expires_at),)).fetchone()
        return bool(r and r[0])
    except Exception:
        return False

def _infer_subscription_from_transactions(conn, user_id: str) -> Tuple[Optional[str], Optional[str]]:
    """Восстановить активный тариф из истории покупок (если в users ещё не проставлено)."""
    try:
        rows = conn.execute(
            """SELECT description, created_at FROM transactions
               WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)
               ORDER BY datetime(created_at) DESC LIMIT 80""",
            (str(user_id),),
        ).fetchall()
    except sqlite3.OperationalError:
        return None, None
    for row in rows:
        desc_raw = _db_row_get(row, "description") or ""
        dl = desc_raw.lower()
        if not any(k in dl for k in ("покупка", "purchase", "тариф", "подписк", "subscription", "plan")):
            continue
        plan = None
        if "team" in dl:
            plan = "team"
        elif "business" in dl or "бизнес" in dl:
            plan = "business"
        elif "pro" in dl or "про" in dl:
            plan = "pro"
        if not plan:
            continue
        purchased_at = _db_row_get(row, "created_at")
        exp = _subscription_expires_after(conn, purchased_at, SUBSCRIPTION_PERIOD_DAYS)
        if exp and _subscription_is_past(conn, exp):
            continue
        return plan, exp
    return None, None

def _minutes_used_for_user(conn, user_id: str) -> float:
    try:
        total_row = conn.execute(
            """SELECT COALESCE(SUM(minutes_delta), 0) AS m FROM user_activity_events WHERE user_id = ?""",
            (str(user_id),),
        ).fetchone()
        return float(_db_row_get(total_row, "m", 0) or 0)
    except Exception:
        return 0.0

def record_user_activity(user_id: str, action_type: str, phrases_delta: int = 0, minutes_delta: float = 0.0, chars_count: int = 0, voice_mode: str = "standard", voice_name: Optional[str] = None):
    if not user_id or str(user_id).startswith("anonymous_"):
        return
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO user_activity_events (user_id, action_type, phrases_delta, minutes_delta, chars_count, voice_mode, voice_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (str(user_id), action_type, int(phrases_delta or 0), float(minutes_delta or 0.0), int(chars_count or 0), voice_mode, voice_name)
        )
        conn.commit()
    except Exception as e:
        print(f"⚠️ record_user_activity error: {e}", flush=True)
    finally:
        conn.close()

def _derive_conversation_title(messages: List[Dict[str, Any]]) -> str:
    for m in messages:
        if m.get("speaker") == "user" and (m.get("original") or "").strip():
            t = str(m["original"]).strip()[:80]
            if t:
                return t
    for m in messages:
        if (m.get("original") or "").strip():
            return str(m["original"]).strip()[:80]
    return "Беседа"

def _persist_session_background(user_id: str, messages: List[Dict[str, Any]]) -> None:
    """Сохранение истории после стопа — в фоне, чтобы POST /api/control не ждал БД."""
    try:
        sid = persist_conversation_session(user_id, messages)
        if sid:
            print(f"💾 Сессия беседы сохранена (фон): id={sid}, user={user_id}, сообщений={len(messages)}", flush=True)
    except Exception as e:
        print(f"⚠️ persist session background: {e}", flush=True)


def persist_conversation_session(user_id: str, messages: List[Dict[str, Any]]) -> Optional[int]:
    if not messages or not user_id or str(user_id).startswith("anonymous_"):
        return None
    title = _derive_conversation_title(messages)
    try:
        payload = json.dumps(messages, ensure_ascii=False, default=str)
    except Exception as e:
        print(f"⚠️ persist_conversation_session JSON error: {e}", flush=True)
        return None
    conn = get_db_connection()
    try:
        cur = conn.execute(
            "INSERT INTO conversation_sessions (user_id, title, message_count, messages_json) VALUES (?, ?, ?, ?)",
            (str(user_id), title, len(messages), payload)
        )
        conn.commit()
        return int(cur.lastrowid)
    except Exception as e:
        print(f"⚠️ persist_conversation_session DB error: {e}", flush=True)
        return None
    finally:
        conn.close()

# ================= 🔐 AUTHORIZATION HELPERS =================
def _is_anonymous_client_id(uid: Optional[str]) -> bool:
    """Плейсхолдер с клиента (не считаем за попытку IDOR при несовпадении с cookie)."""
    if not uid:
        return True
    s = str(uid).strip().lower()
    return s == "anonymous" or s.startswith("anonymous_")


def get_authorized_user_id(request: Request) -> str:
    cookie_user_id = request.cookies.get("user_id")
    query_user_id = request.query_params.get("user_id")
    header_user_id = request.headers.get("X-User-ID")
    print(f"🔐 Auth check: cookie={cookie_user_id}, query={query_user_id}, header={header_user_id}", flush=True)
    if cookie_user_id:
        if (
            query_user_id
            and not _is_anonymous_client_id(query_user_id)
            and query_user_id != cookie_user_id
        ):
            print(f"🚨 IDOR attempt: query user_id={query_user_id} != cookie={cookie_user_id}", flush=True)
            raise HTTPException(status_code=403, detail="Forbidden")
        if (
            header_user_id
            and not _is_anonymous_client_id(header_user_id)
            and header_user_id != cookie_user_id
        ):
            print(f"🚨 IDOR attempt: header user_id={header_user_id} != cookie={cookie_user_id}", flush=True)
            raise HTTPException(status_code=403, detail="Forbidden")
        return cookie_user_id
    if query_user_id and not query_user_id.startswith('anonymous_'): print(f"⚠️ Localhost dev: используем query user_id={query_user_id}", flush=True); return query_user_id
    if header_user_id and not header_user_id.startswith('anonymous_'): print(f"⚠️ Localhost dev: используем header user_id={header_user_id}", flush=True); return header_user_id
    print(f"⚠️ Unauthorized: no cookie, no valid query/header user_id", flush=True)
    raise HTTPException(status_code=401, detail="Unauthorized")

# ================= 🌐 FRONTEND ROUTES =================
def _resolve_repo_public() -> str:
    """Каталог public: сосед backend/, затем backend/public, затем ./public от cwd."""
    base_abs = os.path.abspath(BASE_DIR)
    repo_root = os.path.abspath(os.path.join(base_abs, ".."))
    candidates = [
        os.path.join(repo_root, "public"),
        os.path.join(base_abs, "public"),
        os.path.abspath(os.path.join(os.getcwd(), "public")),
    ]
    seen = set()
    uniq = []
    for raw in candidates:
        c = os.path.realpath(raw)
        if c in seen or not os.path.isdir(c):
            continue
        seen.add(c)
        uniq.append(c)
    if not uniq:
        return os.path.realpath(candidates[0])
    for c in uniq:
        if os.path.isfile(os.path.join(c, "checkout.html")):
            return c
    markers = ("index.html", "pricing.html")
    for c in uniq:
        if any(os.path.isfile(os.path.join(c, m)) for m in markers):
            return c
    return uniq[0]


def _resolve_repo_frontend() -> str:
    base_abs = os.path.abspath(BASE_DIR)
    repo_root = os.path.abspath(os.path.join(base_abs, ".."))
    for raw in (
        os.path.join(repo_root, "frontend"),
        os.path.join(base_abs, "frontend"),
        os.path.abspath(os.path.join(os.getcwd(), "frontend")),
    ):
        c = os.path.realpath(raw)
        if os.path.isdir(c):
            return c
    return os.path.realpath(os.path.join(repo_root, "frontend"))


public_dir = _resolve_repo_public()
frontend_dir = _resolve_repo_frontend()
_checkout_path = os.path.join(public_dir, "checkout.html")
print(f"🌐 static: public_dir={public_dir}  checkout.html={'ok' if os.path.isfile(_checkout_path) else 'MISSING'}", flush=True)
if not os.path.isfile(_checkout_path):
    print(f"⚠️ Нет checkout: {_checkout_path} — GET /checkout.html вернёт 404. Сделайте git pull и проверьте ветку.", flush=True)

@app.get("/")
async def root():
    landing_path = os.path.join(public_dir, "index.html")
    if os.path.exists(landing_path): return FileResponse(landing_path)
    return Response(content="<script>window.location.href='/ui'</script>", media_type="text/html")

@app.get("/index.html")
async def serve_main_index():
    landing_path = os.path.join(public_dir, "index.html")
    if os.path.exists(landing_path): return FileResponse(landing_path)
    raise HTTPException(404, "Главная страница не найдена")

def _public_html_response(basename: str) -> FileResponse:
    """Отдать public/<basename>.html с проверкой на выход из каталога."""
    if not basename or "/" in basename or "\\" in basename or ".." in basename:
        raise HTTPException(status_code=404, detail="Not Found")
    file_path = os.path.join(public_dir, f"{basename}.html")
    real_public = os.path.realpath(public_dir)
    real_file = os.path.realpath(file_path)
    try:
        inside = os.path.commonpath([real_public, real_file]) == real_public
    except ValueError:
        inside = False
    exists = os.path.isfile(file_path) or os.path.isfile(real_file)
    if not os.path.isdir(real_public) or not inside or not exists:
        raise HTTPException(status_code=404, detail="Not Found")
    send_path = real_file if os.path.isfile(real_file) else file_path
    return FileResponse(send_path, media_type="text/html")

@app.get("/ui")
async def serve_chat():
    chat_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(chat_path): return FileResponse(chat_path)
    raise HTTPException(404, "frontend/index.html not found")

@app.get("/ui/{filename:path}")
async def serve_chat_file(filename: str):
    file_path = os.path.join(frontend_dir, filename)
    if not os.path.abspath(file_path).startswith(os.path.abspath(frontend_dir)): raise HTTPException(status_code=404, detail="File not found")
    if os.path.exists(file_path) and os.path.isfile(file_path):
        if filename.endswith('.js'): return FileResponse(file_path, media_type="application/javascript")
        elif filename.endswith('.css'): return FileResponse(file_path, media_type="text/css")
        elif filename.endswith('.html'): return FileResponse(file_path, media_type="text/html")
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail=f"File {filename} not found")

@app.get("/dashboard.html")
async def serve_dashboard():
    return _public_html_response("dashboard")

@app.get("/login.html")
async def serve_login():
    return _public_html_response("login")

@app.get("/features.html")
async def serve_features():
    return _public_html_response("features")

@app.get("/technology.html")
async def serve_technology():
    return _public_html_response("technology")

@app.get("/pricing.html")
async def serve_pricing():
    return _public_html_response("pricing")


@app.get("/checkout.html")
async def serve_checkout():
    return _public_html_response("checkout")

@app.get("/faq.html")
async def serve_faq():
    return _public_html_response("faq")

@app.get("/contacts.html")
async def serve_contacts():
    return _public_html_response("contacts")


@app.get("/trial-setup.html")
async def serve_trial_setup_page():
    return _public_html_response("trial-setup")


@app.get("/trial-chat.html")
async def serve_trial_chat_page():
    return _public_html_response("trial-chat")


@app.get("/favicon.svg")
async def serve_favicon_svg():
    file_path = os.path.join(public_dir, "favicon.svg")
    if os.path.isfile(file_path):
        return FileResponse(file_path, media_type="image/svg+xml")
    raise HTTPException(404, "favicon not found")


@app.get("/favicon.ico")
async def serve_favicon_ico():
    file_path = os.path.join(public_dir, "favicon.svg")
    if os.path.isfile(file_path):
        return FileResponse(file_path, media_type="image/svg+xml")
    raise HTTPException(404, "favicon not found")


@app.get("/css/{filename:path}")
async def serve_css(filename: str):
    file_path = os.path.join(public_dir, "css", filename)
    if os.path.exists(file_path): return FileResponse(file_path, media_type="text/css")
    raise HTTPException(404, "CSS not found")

@app.get("/js/{filename:path}")
async def serve_js(filename: str):
    file_path = os.path.join(public_dir, "js", filename)
    if os.path.exists(file_path): return FileResponse(file_path, media_type="application/javascript")
    raise HTTPException(404, "JS not found")


@app.get("/img/{filename:path}")
async def serve_public_img(filename: str):
    """Статика public/img (SVG, PNG и т.д.) — лендинг ссылается на /img/..."""
    if not filename or ".." in filename.replace("\\", "/"):
        raise HTTPException(status_code=404, detail="Not Found")
    # abspath + normcase: на Windows realpath/startswith ломается из‑за C: vs c: и \\?\ префиксов
    rel = os.path.normpath(filename.replace("/", os.sep))
    if rel.startswith("..") or os.path.isabs(rel):
        raise HTTPException(status_code=404, detail="Not Found")
    img_root = os.path.abspath(os.path.join(public_dir, "img"))
    file_path = os.path.abspath(os.path.join(img_root, rel))
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    if not os.path.normcase(file_path).startswith(os.path.normcase(img_root + os.sep)):
        raise HTTPException(status_code=404, detail="Image not found")
    # Фактический формат по сигнатуре (часто JPEG ошибочно сохранён как .png — браузер тогда не рисует картинку)
    try:
        with open(file_path, "rb") as _imgf:
            _head = _imgf.read(24)
    except OSError:
        _head = b""
    _strip = _head.lstrip(b"\xef\xbb\xbf \t\r\n")
    if _head.startswith(b"\xff\xd8\xff"):
        media_type = "image/jpeg"
    elif _head.startswith(b"\x89PNG\r\n\x1a\n"):
        media_type = "image/png"
    elif _head.startswith((b"GIF87a", b"GIF89a")):
        media_type = "image/gif"
    elif len(_head) >= 12 and _head.startswith(b"RIFF") and _head[8:12] == b"WEBP":
        media_type = "image/webp"
    elif _strip.startswith(b"<?xml") or _strip.startswith(b"<svg"):
        media_type = "image/svg+xml"
    else:
        fl = filename.lower()
        if fl.endswith(".svg"):
            media_type = "image/svg+xml"
        elif fl.endswith(".png"):
            media_type = "image/png"
        elif fl.endswith((".jpg", ".jpeg")):
            media_type = "image/jpeg"
        elif fl.endswith(".webp"):
            media_type = "image/webp"
        else:
            media_type = None
    return FileResponse(file_path, media_type=media_type)

# ================= 🔐 AUTH ENDPOINTS =================
@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    try:
        conn = get_db_connection()
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone()
        if existing: conn.close(); raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
        password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
        cursor = conn.execute("INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)", (req.email, req.name, password_hash))
        user_id = cursor.lastrowid; conn.commit(); conn.close()
        print(f"✅ Регистрация: {req.email} (id={user_id})", flush=True)
        return {"user": {"id": user_id, "email": req.email, "username": req.name}, "message": "Регистрация успешна"}
    except HTTPException: raise
    except Exception as e: print(f"❌ Register error: {e}", flush=True); raise HTTPException(status_code=500, detail="Ошибка регистрации")

@app.post("/api/auth/login")
async def login(req: LoginRequest, response: Response):
    try:
        conn = get_db_connection()
        user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email.strip(),)).fetchone(); conn.close()
        if not user: print(f"⚠️ Login failed: User {req.email} not found"); raise HTTPException(status_code=401, detail="Неверный email или пароль")
        stored_hash = user['password_hash']
        if isinstance(stored_hash, str): stored_hash = stored_hash.encode('utf-8')
        password_bytes = req.password.encode('utf-8')
        if not bcrypt.checkpw(password_bytes, stored_hash): print(f"⚠️ Login failed: Wrong password for {req.email}"); raise HTTPException(status_code=401, detail="Неверный email или пароль")
        response.set_cookie(key="user_id", value=str(user['id']), httponly=True, max_age=60 * 60 * 24 * 7, samesite="lax", domain="localhost")
        return {"status": "ok", "user_id": user['id'], "email": user['email']}
    except HTTPException: raise
    except Exception as e: print(f"❌ Login error: {e}"); raise HTTPException(status_code=500, detail="Ошибка сервера при входе")

@app.get("/api/auth/me")
async def get_me(request: Request):
    try:
        user_id = request.cookies.get("user_id")
        if not user_id: raise HTTPException(status_code=401, detail="Unauthorized")
        conn = get_db_connection()
        user = conn.execute(
            "SELECT id, email, username, created_at, ai_conversation_description, phrase_silence_sec FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        conn.close()
        if not user: raise HTTPException(status_code=401, detail="Unauthorized")
        preset = _db_row_get(user, "ai_conversation_description", None) or ""
        psec = _db_row_get(user, "phrase_silence_sec", None)
        return {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "created_at": user["created_at"],
            "createdAt": user["created_at"],
            "ai_conversation_description": preset,
            "phrase_silence_sec": float(psec) if psec is not None else None,
        }
    except HTTPException: raise
    except Exception as e: print(f"❌ Get me error: {e}", flush=True); raise HTTPException(status_code=500, detail="Ошибка")

AI_CONVERSATION_DESCRIPTION_MAX_LEN = 8000

@app.put("/api/user/conversation-settings")
async def update_conversation_settings(req: ConversationSettingsRequest, request: Request):
    try:
        user_id = get_authorized_user_id(request)
        raw = req.ai_conversation_description if req.ai_conversation_description is not None else ""
        text = raw.strip()
        if len(text) > AI_CONVERSATION_DESCRIPTION_MAX_LEN:
            raise HTTPException(status_code=400, detail=f"Не более {AI_CONVERSATION_DESCRIPTION_MAX_LEN} символов")
        uid = int(user_id) if str(user_id).isdigit() else user_id
        phrase_val: Optional[float] = None
        if req.phrase_silence_sec is not None:
            pv = float(req.phrase_silence_sec)
            phrase_val = min(PHRASE_SILENCE_MAX_SEC, max(PHRASE_SILENCE_MIN_SEC, pv))
            phrase_val = round(phrase_val, 2)
        conn = get_db_connection()
        try:
            if phrase_val is not None:
                conn.execute(
                    "UPDATE users SET ai_conversation_description = ?, phrase_silence_sec = ? WHERE id = ?",
                    (text or None, phrase_val, uid),
                )
            else:
                conn.execute(
                    "UPDATE users SET ai_conversation_description = ? WHERE id = ?",
                    (text or None, uid),
                )
            conn.commit()
        finally:
            conn.close()
        return {"status": "ok", "ai_conversation_description": text, "phrase_silence_sec": phrase_val}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ conversation-settings: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Ошибка сохранения")

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="user_id", domain="localhost", path="/")
    print("🔐 Выход выполнен", flush=True)
    return {"message": "Выход успешен"}

@app.get("/api/auth/current-user")
async def get_current_user(request: Request):
    try:
        user_id = request.cookies.get("user_id")
        if user_id: print(f"🔐 /api/auth/current-user: вернул user_id={user_id} из куки", flush=True); return {"id": user_id, "authenticated": True}
        else: print(f"🔐 /api/auth/current-user: нет авторизации, вернул anonymous", flush=True); return {"id": "anonymous", "authenticated": False}
    except Exception as e: print(f"❌ Error in /api/auth/current-user: {e}", flush=True); return {"id": "anonymous", "authenticated": False}


@app.post("/api/trial/clone-upload")
async def api_trial_clone_upload(request: Request, file: UploadFile = File(...), name: str = Form("Демо голос")):
    """Один клон для демо: только для авторизованного пользователя (тот же диск, что и основной клонер)."""
    user_id = get_authorized_user_id(request)
    from . import voice_cloner

    user_voices = voice_cloner.list_available_voices(VOICES_ROOT_DIR, user_id=str(user_id))
    if len(user_voices) >= voice_cloner.get_voice_limit():
        raise HTTPException(status_code=400, detail="Достигнут лимит голосов. Удалите голос в кабинете и повторите.")
    if not file.filename or not file.filename.lower().endswith((".wav", ".mp3", ".ogg", ".flac")):
        raise HTTPException(status_code=400, detail="Формат: WAV, MP3, OGG, FLAC или WEBM")
    temp_dir = os.path.join(VOICES_ROOT_DIR, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] or ".wav"
    temp_path = os.path.join(temp_dir, f"trial_{uuid.uuid4().hex}{ext}")
    try:
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Файл больше 10 МБ")
        with open(temp_path, "wb") as f:
            f.write(content)
        validation = voice_cloner.validate_audio_file(temp_path)
        if not validation.get("valid"):
            os.remove(temp_path)
            raise HTTPException(status_code=400, detail="Некорректное аудио")
        voice_id = str(uuid.uuid4())[:8]
        voice_cloner.save_voice_config(
            voices_dir=VOICES_ROOT_DIR,
            voice_id=voice_id,
            name=name.strip() or "Демо голос",
            sample_path=temp_path,
            language="auto",
            user_id=str(user_id),
            metadata={"source": "trial_wizard", "original_filename": file.filename},
        )
        try:
            os.remove(temp_path)
        except OSError:
            pass
        return {"voice_id": voice_id, "name": name, "message": "Голос сохранён — будет использован в демо и в основном чате."}
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        print(f"❌ trial clone-upload: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trial/create")
async def api_trial_create(body: TrialCreateBody, request: Request):
    auth_ok = False
    uid: Optional[str] = None
    try:
        uid = str(get_authorized_user_id(request))
        auth_ok = True
    except HTTPException:
        auth_ok = False
        uid = None
    topic = (body.topic or "business").strip().lower()
    if topic not in ("business", "interview", "friendly", "work"):
        topic = "business"
    sid = trial_flow.create_session(
        topic=topic,
        settings=body.settings or {},
        authenticated=auth_ok,
        clone_voice_id=(body.clone_voice_id or "").strip() or None,
        clone_user_id=uid if auth_ok and (body.clone_voice_id or "").strip() else None,
    )
    return {"session_id": sid, "topic": topic, "authenticated": auth_ok}


@app.get("/api/trial/session")
async def api_trial_session(session_id: str = Query(..., alias="session_id")):
    v = trial_flow.session_public_view(session_id)
    if not v:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    return v


@app.post("/api/trial/bootstrap")
async def api_trial_bootstrap(
    session_id: str = Query(..., alias="session_id"),
    partner_edge_voice: Optional[str] = Query(None, alias="partner_edge_voice"),
):
    try:
        return await trial_flow.trial_bootstrap(session_id, partner_edge_voice=partner_edge_voice)
    except ValueError as e:
        if str(e) == "session_not_found":
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ trial bootstrap: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trial/turn")
async def api_trial_turn(body: TrialTurnBody):
    try:
        return await trial_flow.trial_after_user(
            body.session_id.strip(),
            body.user_text,
            partner_edge_voice=body.partner_edge_voice,
        )
    except ValueError as e:
        if str(e) == "session_not_found":
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        if str(e) == "empty_user":
            raise HTTPException(status_code=400, detail="Пустой текст")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ trial turn: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trial/chat-ui")
async def api_trial_chat_ui(session_id: str = Query(..., alias="session_id")):
    if not trial_flow.get_session(session_id):
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    return {"messages": trial_flow.chat_messages_for_api(session_id)}


@app.post("/api/trial/reply-hints")
async def api_trial_reply_hints(body: TrialReplyHintsBody):
    hints = trial_flow.trial_reply_hints(body.session_id.strip(), body.partner_phrase)
    return {"suggestions": hints}


@app.post("/api/trial/stt-suggestions")
async def api_trial_stt_suggestions(body: TrialSttSuggestionsBody):
    sugg = trial_flow.trial_suggestions_for_session(body.session_id.strip(), body.text)
    return {"suggestions": sugg}


# 🔥 Эндпоинты для голосов
@app.get("/api/voices")
async def get_voices(request: Request):
    try:
        authorized_user_id = get_authorized_user_id(request)
        voices_data = await edge_tts.list_voices()
        neural_voices = sorted([v["ShortName"].strip() for v in voices_data if "Neural" in v.get("ShortName", "")])
        cloned = await get_cloned_voices(authorized_user_id)
        cloned_options = [{"id": v["id"], "name": v["name"]} for v in cloned]
        return {"voices": neural_voices, "cloned_voices": cloned_options}
    except HTTPException: raise
    except Exception as e:
        fallback_voices = ["en-US-JennyNeural", "en-US-GuyNeural", "en-US-AriaNeural", "ru-RU-SvetlanaNeural", "ru-RU-DmitryNeural", "de-DE-KatjaNeural", "es-ES-ElviraNeural", "fr-FR-DeniseNeural"]
        return {"voices": fallback_voices, "cloned_voices": [], "warning": str(e)}

@app.post("/api/preview-voice")
async def preview_voice(req: VoicePreviewRequest):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            voice = req.voice.strip()
            if not voice: raise ValueError("Empty voice")
            if voice.startswith("cloned:"): return await preview_cloned_voice(req)
            comm = edge_tts.Communicate("Hello. Test.", voice); mp3_data = b""
            async for chunk in comm.stream():
                if chunk["type"] == "audio": mp3_data += chunk["data"]
            if len(mp3_data) < 100: raise ValueError("Empty stream")
            return Response(content=mp3_data, media_type="audio/mpeg")
        except Exception as e:
            if attempt < max_retries - 1: await asyncio.sleep(0.5); continue
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/preview-cloned-voice")
async def preview_cloned_voice(req: VoicePreviewRequest, request: Request):
    authorized_user_id = get_authorized_user_id(request)
    if not req.voice: raise HTTPException(status_code=400, detail="Нет текста для синтеза")
    voice_id = req.voice.replace("cloned:", "").strip()
    if not voice_id: raise HTTPException(status_code=400, detail="Не указан ID голоса")
    try:
        async with aiohttp.ClientSession() as session:
            payload = {"voice_id": voice_id, "text": req.text or "Привет! Это мой клонированный голос."}
            base = _effective_cloning_base(bool(req.clone_via_modal))
            url = f"{base}/preview"
            async with session.post(url, json=payload, params={"user_id": authorized_user_id}) as resp:
                if resp.status == 200: data = await resp.read(); return Response(content=data, media_type="audio/wav")
                else: error_detail = await resp.text(); print(f"❌ Ошибка сервиса клонирования: {resp.status} - {error_detail}"); raise HTTPException(status_code=resp.status, detail=f"Сервис клонирования вернул ошибку: {error_detail}")
    except aiohttp.ClientError as e: print(f"❌ Ошибка соединения с сервисом клонирования: {e}"); raise HTTPException(status_code=503, detail="Сервис клонирования недоступен")
    except Exception as e: print(f"❌ Критическая ошибка предпрослушивания: {e}"); raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts")
async def tts(req: TTSRequest, request: Request):
    try:
        if req.voice.startswith("cloned:"): return await tts_cloned(req, request)
        authorized_user_id = get_authorized_user_id(request)
        samples, rate, _ = await speak_text(req.text, voice=req.voice)
        if req.play_locally and samples is not None:
            sd.play(samples, samplerate=rate, device=engine.speaker_idx); sd.wait()
            record_user_activity(
                user_id=authorized_user_id,
                action_type="tts_standard",
                phrases_delta=1,
                minutes_delta=float(len(samples) / rate / 60.0) if rate else 0.0,
                chars_count=len(req.text or ""),
                voice_mode="standard",
                voice_name=req.voice
            )
            return {"status": "played"}
        comm = edge_tts.Communicate(req.text, req.voice); mp3 = b""
        async for c in comm.stream():
            if c["type"] == "audio": mp3 += c["data"]
        return Response(content=mp3, media_type="audio/mpeg")
    except Exception as e: raise HTTPException(500, str(e))

@app.post("/api/tts-cloned")
async def tts_cloned(req: TTSRequest, request: Request):
    print(f"🔊 tts_cloned: вход, voice={req.voice}", flush=True)
    authorized_user_id = get_authorized_user_id(request)
    if req.voice.startswith("cloned:"):
        voice_id = req.voice.replace("cloned:", "")
        print(f"🔊 tts_cloned: клонированный голос, voice_id={voice_id}, user_id={authorized_user_id}", flush=True)
        audio_bytes = await generate_cloned_audio(req.text, voice_id, authorized_user_id, use_modal=bool(req.clone_via_modal))
        if audio_bytes:
            print(f"🔊 tts_cloned: аудио сгенерировано, длина={len(audio_bytes)} байт", flush=True)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp: tmp.write(audio_bytes); tmp_path = tmp.name
            try:
                data, rate = sf.read(tmp_path)
                if req.play_locally:
                    print(f"🔊 tts_cloned: воспроизведение локально, rate={rate}", flush=True)
                    sd.play(data, samplerate=rate, device=engine.speaker_idx); sd.wait()
                    record_user_activity(
                        user_id=authorized_user_id,
                        action_type="tts_cloned",
                        phrases_delta=1,
                        minutes_delta=float(len(data) / rate / 60.0) if rate else 0.0,
                        chars_count=len(req.text or ""),
                        voice_mode="cloned",
                        voice_name=req.voice
                    )
                    return {"status": "played", "type": "cloned"}
                return Response(content=audio_bytes, media_type="audio/wav")
            finally:
                if os.path.exists(tmp_path): os.remove(tmp_path)
        print(f"⚠️ tts_cloned: generate_cloned_audio вернул None", flush=True)
        raise HTTPException(500, "Failed to generate cloned voice")
    print(f"⚠️ tts_cloned: voice не начинается с 'cloned:', fallback к стандартному TTS", flush=True)
    return await tts(req, request)

@app.get("/api/cloned-voices")
async def get_cloned_voices_endpoint(request: Request):
    authorized_user_id = get_authorized_user_id(request)
    voices = await get_cloned_voices(authorized_user_id)
    cloned_options = [{"value": f"cloned:{v['id']}", "label": f"🎤 {v['name']} (клони)", "cloned": True} for v in voices]
    return {"voices": cloned_options}

@app.get("/api/health")
async def health(): return {"status": "ok"}


@app.get("/api/config")
async def public_payment_config():
    """Публичная конфигурация для Stripe.js (как в server.js). Секреты не отдаём."""
    pk = (os.environ.get("STRIPE_PUBLISHABLE_KEY") or "").strip()
    return {
        "stripePublishableKey": pk if pk else None,
        "nowPaymentsEnabled": bool((os.environ.get("NOWPAYMENTS_API_KEY") or "").strip()),
        "stripeEnabled": bool((os.environ.get("STRIPE_SECRET_KEY") or "").strip()),
    }


@app.post("/api/stripe/create")
async def api_stripe_create_payment(request: Request, body: StripeCreateRequest):
    """Создание Payment Intent (клиент подтверждает карту через stripe-ui.js)."""
    user_id = get_authorized_user_id(request)
    if body.amount is None or float(body.amount) < 1:
        raise HTTPException(status_code=400, detail="Минимальная сумма: $1")
    sk = (
        (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
        or (os.environ.get("STRIPE_API_KEY") or "").strip()
    )
    if not sk:
        raise HTTPException(
            status_code=503,
            detail="Stripe не настроен: добавьте STRIPE_SECRET_KEY (sk_test_… или sk_live_…) в .env в корне проекта или в backend/.env и перезапустите сервер.",
        )
    try:
        import stripe as stripe_mod
    except ImportError:
        raise HTTPException(status_code=503, detail="Установите пакет: pip install stripe")
    stripe_mod.api_key = sk
    order_id = f"stripe_{user_id}_{int(time.time() * 1000)}"
    cur = (body.currency or "USD").strip().lower() or "usd"
    try:
        pi = stripe_mod.PaymentIntent.create(
            amount=int(round(float(body.amount) * 100)),
            currency=cur,
            metadata={"userId": str(user_id), "orderId": order_id},
            automatic_payment_methods={"enabled": True},
        )
    except Exception as e:
        print(f"❌ Stripe PaymentIntent.create: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO transactions (user_id, amount, description, type) VALUES (?, ?, ?, ?)",
            (str(user_id), float(body.amount), f"Stripe pending {pi.id} ({order_id})", "stripe"),
        )
        conn.commit()
    finally:
        conn.close()
    return {
        "success": True,
        "paymentIntentId": pi.id,
        "clientSecret": pi.client_secret,
        "amount": float(body.amount),
        "currency": cur,
    }


def _client_ip_for_geo(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return ""


def _lang_from_accept_language(accept: Optional[str]) -> str:
    if not accept:
        return "ru"
    first = accept.split(",")[0].strip().split(";")[0].strip().lower()
    if first.startswith("ru"):
        return "ru"
    if first.startswith("en"):
        return "en"
    if first.startswith("de"):
        return "de"
    if first.startswith("fr"):
        return "fr"
    if first.startswith("es"):
        return "es"
    return "ru"


def _country_code_to_site_lang(code: Optional[str]) -> str:
    if not code:
        return "en"
    c = str(code).upper()
    if c in ("RU", "BY", "KZ", "KG", "UZ", "TJ", "TM", "MD", "AM"):
        return "ru"
    if c in ("UA",):
        return "ru"
    if c in ("DE", "AT", "LI"):
        return "de"
    if c in ("FR", "BE", "MC", "LU"):
        return "fr"
    if c in ("ES", "MX", "AR", "CO", "CL", "PE", "VE", "PT"):
        return "es"
    if c in ("US", "GB", "CA", "AU", "NZ", "IE", "IN", "SG", "PH", "ZA", "NL", "SE", "NO", "DK", "FI", "PL", "CZ", "IT", "GR", "JP", "KR", "CN", "TW", "HK", "IL", "AE", "SA", "BR", "CH"):
        return "en"
    return "en"


SUPPORTED_SITE_LANGS = ("ru", "en", "de", "fr", "es")


@app.get("/api/site/detect-language")
async def site_detect_language(request: Request):
    """Язык интерфейса лендинга: по IP (country) или Accept-Language для localhost/LAN."""
    ip = _client_ip_for_geo(request)
    lang: Optional[str] = None
    source = "default"
    local = (
        not ip
        or ip in ("127.0.0.1", "::1", "localhost")
        or ip.startswith("192.168.")
        or ip.startswith("10.")
        or ip.startswith("172.16.")
    )
    if local:
        lang = _lang_from_accept_language(request.headers.get("accept-language"))
        source = "accept"
    else:
        try:
            r = requests.get(f"http://ip-api.com/json/{ip}?fields=status,countryCode", timeout=2.5)
            if r.status_code == 200:
                j = r.json()
                if j.get("status") == "success" and j.get("countryCode"):
                    lang = _country_code_to_site_lang(j.get("countryCode"))
                    source = "ip"
        except Exception as e:
            print(f"⚠️ site/detect-language ip-api: {e}", flush=True)
    if not lang:
        lang = _lang_from_accept_language(request.headers.get("accept-language"))
        source = "accept"
    if lang not in SUPPORTED_SITE_LANGS:
        lang = "en"
    return {"lang": lang, "source": source}

@app.get("/api/user/cloned-voices")
async def get_user_cloned_voices(request: Request):
    authorized_user_id = get_authorized_user_id(request)
    voices = await get_cloned_voices(authorized_user_id)
    return {"voices": voices, "count": len(voices), "user_id": authorized_user_id}

# ==========================================================
# РЕАЛЬНЫЕ ЭНДПОИНТЫ
# ==========================================================

@app.get("/api/status")
async def api_status(): return engine.get_status()


@app.post("/api/phrase-silence")
async def api_phrase_silence(req: PhraseSilenceRequest):
    v = engine.set_phrase_silence_sec(req.seconds)
    return {"status": "ok", "phrase_silence_sec": v}


@app.post("/api/mic-rms-threshold")
async def api_mic_rms_threshold(req: MicRmsThresholdRequest):
    v = engine.set_mic_rms_threshold(req.threshold)
    return {"status": "ok", "mic_rms_threshold": v}

@app.get("/api/chat")
async def api_chat(): return {"messages": engine.get_chat_history()}

@app.post("/api/delete_message")
async def api_delete_message(req: DeleteRequest):
    if not engine.delete_message(int(req.msg_id)):
        raise HTTPException(status_code=404, detail="Сообщение не найдено")
    return {"status": "ok", "id": int(req.msg_id)}

def _normalize_suggestion_list(raw, need=5, min_len=10):
    """Убирает почти дубликаты и слишком короткие строки."""
    if not isinstance(raw, list):
        return []
    out = []
    seen = set()
    for item in raw:
        s = str(item or "").strip()
        if len(s) < min_len:
            continue
        key = re.sub(r"\s+", " ", s.lower())[:96]
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
        if len(out) >= need * 2:
            break
    return out[:need]


# 🔥 ОБНОВЛЕНО: Поддержка реального аудио в запросе
@app.post("/api/suggestions")
async def get_suggestions(req: SuggestionsRequest, request: Request):
    """
    Генерирует подсказки через AI с учётом аудио и ТЕМЫ разговора.
    """
    try:
        text = req.text.strip()
        topic = (req.topic or "").strip() or engine.ai_topic or "general"
        if not text:
            return {"suggestions": []}

        with engine.history_lock:
            recent_dialog = []
            for msg in engine.history[-8:]:
                original = (msg.get("original") or "").strip()
                if not original:
                    continue
                speaker = "User" if msg.get("speaker") == "user" else "Partner"
                recent_dialog.append(f"{speaker}: {original}")
        conversation_context = "\n".join(recent_dialog[-6:]) if recent_dialog else "(no recent dialog)"

        has_audio = bool(req.audio_data and getattr(req.audio_data, "data", None))
        audio_b64 = (req.audio_data.data or "").strip() if req.audio_data else ""
        if has_audio:
            print(f"🎤 Получено аудио от фронтенда: {len(audio_b64)} chars base64", flush=True)
        else:
            print("⚠️ Аудио нет — исправление только по тексту и теме (OpenRouter)", flush=True)

        if not OPENROUTER_API_KEY or OPENROUTER_API_KEY.startswith("sk-or-v1-CHANGE_ME"):
            print("⚠️ OpenRouter API ключ не настроен! Используем локальный fallback", flush=True)
            return await _get_suggestions_local(req)

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Voice Translator",
        }

        audio_note = (
            "Attached audio is the raw recording of the same utterance as the STT line. Prefer what you clearly hear if it conflicts with STT."
            if has_audio
            else "No audio attached. Infer the intended phrase from STT text, topic, and recent dialogue context."
        )
        prompt_text = f"""Тема и лексика беседы (может быть на русском с англ. терминами):
\"\"\"{topic}\"\"\"

Недавний диалог:
{conversation_context}

Результат распознавания речи (часто с ошибками):
\"\"\"{text}\"\"\"

{audio_note}

Задача: верни РОВНО 5 строк — корректные и естественные формулировки того, что пользователь, вероятно, хотел сказать по смыслу.

СТРОГО:
- Только JSON-массив из 5 строк, без markdown и без пояснений.
- Каждая строка — законченная мысль или вопрос; минимум 12 символов.
- 5 вариантов должны быть релевантны текущей теме/контексту беседы и отличаться по формулировке.
- Не уводи в узкие домены, если они не следуют из темы и диалога.
- Не добавляй факты, которых нет в исходной фразе/контексте."""

        if has_audio:
            user_message = {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    {"type": "audio_url", "audio_url": {"url": f"audio/wav;base64,{audio_b64}"}},
                ],
            }
            models_to_try = ["openai/gpt-4o-audio-preview", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"]
        else:
            user_message = {"role": "user", "content": prompt_text}
            models_to_try = ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"]

        messages = [
            {
                "role": "system",
                "content": "You fix misrecognized speech using the provided topic and dialogue context. Keep suggestions on-topic and output only a JSON array of strings.",
            },
            user_message,
        ]

        last_error = None
        for model in models_to_try:
            try:
                payload = {"model": model, "messages": messages, "temperature": 0.92, "max_tokens": 900}
                print(f"🤖 Подсказки: модель={model}, audio={has_audio}, тема len={len(topic)}", flush=True)
                resp = requests.post(OPENROUTER_ENDPOINT, json=payload, headers=headers, timeout=55)
                if resp.status_code != 200:
                    last_error = resp.text[:200]
                    print(f"⚠️ Модель {model} вернула {resp.status_code}, следующая…", flush=True)
                    continue
                content = resp.json()["choices"][0]["message"]["content"].strip()
                content = re.sub(r"```json\s*|\s*```", "", content)
                suggestions = json.loads(content)
                if not isinstance(suggestions, list):
                    continue
                suggestions = _normalize_suggestion_list(suggestions, need=10, min_len=12)
                if len(suggestions) < 3:
                    continue
                if len(suggestions) < 5:
                    fb = (await _get_suggestions_local(req))["suggestions"]
                    suggestions = _normalize_suggestion_list(suggestions + fb, need=5, min_len=8)
                if len(suggestions) < 5:
                    suggestions = (suggestions + [text])[:5]
                print(f"✅ Подсказки: {len(suggestions)} вариантов через {model}", flush=True)
                return {"suggestions": suggestions[:5]}
            except Exception as e:
                print(f"⚠️ Ошибка с моделью {model}: {e}", flush=True)
                last_error = str(e)
                continue

        print(f"⚠️ Все модели подсказок не сработали: {last_error}", flush=True)
        return await _get_suggestions_local(req)

    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}", flush=True)
        return await _get_suggestions_local(req)
    except requests.exceptions.Timeout:
        print("❌ OpenRouter timeout, используем fallback", flush=True)
        return await _get_suggestions_local(req)
    except requests.exceptions.RequestException as e:
        print(f"❌ OpenRouter request error: {e}, используем fallback", flush=True)
        return await _get_suggestions_local(req)
    except Exception as e:
        print(f"❌ Suggestions error: {type(e).__name__}: {e}, используем fallback", flush=True)
        return await _get_suggestions_local(req)

# ================= 🔤 ЛОКАЛЬНЫЙ FALLBACK =================
async def _get_suggestions_local(req: SuggestionsRequest) -> dict:
    try:
        text = req.text.strip()
        if not text: return {"suggestions": []}
        is_russian = any(ord(c) > 127 for c in text)
        if is_russian:
            variations = [f"{text}?", f"{text}.", f"Вы: {text}?", f"Интересует: {text}", f"Расскажите: {text}"]
        else:
            variations = [f"{text}?", f"{text}.", f"Do you: {text}?", f"Tell me: {text}", f"About: {text}"]
        unique = []
        seen = set()
        for v in variations:
            key = v.lower().strip()
            if key not in seen: seen.add(key); unique.append(v)
        while len(unique) < 5: unique.append(text)
        print(f"✅ Сгенерировано {len(unique)} вариаций (локальный fallback)", flush=True)
        return {"suggestions": unique[:5]}
    except Exception as e: print(f"❌ Local suggestions error: {e}", flush=True); return {"suggestions": [req.text.strip()] * 5}

@app.post("/api/ai-config")
async def set_ai_config(req: AIConfigRequest, request: Request):
    try:
        engine.ai_enabled = req.enabled
        engine.ai_topic = req.topic if req.topic else "general conversation"
        print(f"🤖 AI config: enabled={req.enabled}, topic='{engine.ai_topic}'", flush=True)
        return {"status": "ok", "ai_enabled": req.enabled, "ai_topic": engine.ai_topic}
    except Exception as e: print(f"❌ AI config error: {e}", flush=True); raise HTTPException(status_code=500, detail=str(e))

# 🔥 НОВЫЙ эндпоинт для переключения режима распознавания
@app.post("/api/recognition-mode")
async def set_recognition_mode(req: RecognitionModeRequest, request: Request):
    """Режим распознавания глобально для движка. Авторизация не обязательна — иначе UI «Pro», а сервер оставался basic."""
    user_note = "anonymous"
    try:
        user_note = str(get_authorized_user_id(request))
    except HTTPException:
        pass
    except Exception as e:
        user_note = f"?({e})"
    old_mode = engine.recognition_mode
    engine.set_recognition_mode(req.mode)
    print(f"🔧 Режим распознавания: {old_mode} → {req.mode} (user={user_note}, AITUNNEL_READY={AITUNNEL_READY})", flush=True)
    return {"status": "ok", "mode": engine.recognition_mode, "old_mode": old_mode, "aitunnel_ready": AITUNNEL_READY}

@app.post("/api/conversation-languages")
async def set_conversation_languages(req: ConversationLanguagesRequest, request: Request):
    try:
        user_id = get_authorized_user_id(request)
        engine.set_conversation_languages(req.user_lang, req.partner_lang)
        print(f"🌐 User {user_id} set conversation languages: you={req.user_lang}, partner={req.partner_lang}", flush=True)
        return {
            "status": "ok",
            "user_language": engine.user_language,
            "partner_language": engine.partner_language
        }
    except Exception as e:
        print(f"❌ Conversation languages error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/stats")
async def get_user_stats(request: Request):
    user_id = get_authorized_user_id(request); conn = get_db_connection()
    try:
        total_row = conn.execute(
            """SELECT 
                COALESCE(SUM(phrases_delta), 0) AS phrases_translated,
                COALESCE(SUM(minutes_delta), 0) AS minutes_used,
                COALESCE(SUM(chars_count), 0) AS total_chars
               FROM user_activity_events
               WHERE user_id = ?""",
            (user_id,)
        ).fetchone()
        days_row = conn.execute(
            "SELECT COUNT(DISTINCT DATE(created_at)) AS days_active FROM user_activity_events WHERE user_id = ?",
            (user_id,)
        ).fetchone()
        try:
            voices_data = await edge_tts.list_voices()
            standard_voices_count = len([v for v in voices_data if "Neural" in v.get("ShortName", "")])
        except Exception:
            standard_voices_count = 8
        try:
            cloned_count = len(await get_cloned_voices(user_id))
        except Exception:
            cloned_count = 0
        sub_plan = "free"
        try:
            urow = conn.execute("SELECT subscription_level FROM users WHERE id = ?", (user_id,)).fetchone()
            lv = (_db_row_get(urow, "subscription_level") or "").strip().lower()
            if lv and lv != "free":
                sub_plan = lv
        except Exception:
            pass
        result = {
            "minutesUsed": round(float(total_row["minutes_used"] if total_row else 0.0), 2),
            "phrasesTranslated": int(total_row["phrases_translated"] if total_row else 0),
            "voicesCount": int(standard_voices_count + cloned_count),
            "accuracy": 98,
            "subscription": sub_plan,
            "daysActive": int(days_row["days_active"] if days_row else 0),
            "totalChars": int(total_row["total_chars"] if total_row else 0)
        }
        return result
    finally: conn.close()

@app.post("/api/user/stats")
async def save_user_stats(request: Request, req: UserStatsUpdateRequest):
    user_id = get_authorized_user_id(request)
    record_user_activity(
        user_id=user_id,
        action_type="frontend_stats",
        phrases_delta=int(req.phrasesTranslated or 0),
        minutes_delta=float(req.minutesUsed or 0.0),
        chars_count=int(req.charsCount or 0),
        voice_mode="mixed",
        voice_name=None
    )
    return {"status": "ok"}

@app.get("/api/user/balance")
async def get_user_balance(request: Request):
    user_id = get_authorized_user_id(request); conn = get_db_connection()
    try:
        cursor = conn.execute("PRAGMA table_info(users)"); columns = [row[1] for row in cursor.fetchall()]
        if "balance" in columns: user = conn.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone(); balance = user["balance"] if user and user["balance"] else 0.0
        else: balance = 0.0
        return {"balance": balance, "currency": "RUB"}
    except sqlite3.OperationalError as e: print(f"⚠️ Ошибка запроса баланса: {e}", flush=True); return {"balance": 0.0, "currency": "RUB", "warning": "Column not found"}
    finally: conn.close()

@app.get("/api/user/transactions")
async def get_user_transactions(request: Request):
    user_id = get_authorized_user_id(request); conn = get_db_connection()
    try:
        try:
            rows = conn.execute(
                """SELECT id, amount, description, created_at, type FROM transactions
                   WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT) ORDER BY datetime(created_at) DESC LIMIT 50""",
                (str(user_id),),
            ).fetchall()
            transactions = [{"id": row["id"], "amount": row["amount"], "description": row["description"], "date": row["created_at"], "type": row["type"]} for row in rows]
        except sqlite3.OperationalError: transactions = []
        return {"transactions": transactions}
    finally: conn.close()

@app.get("/api/subscriptions/plans")
async def get_subscription_plans():
    return {
        "plans": [
            {"id": "free", "name": "free", "displayName": "Free", "price": 0, "minutesLimit": 60, "voicesLimit": 5, "popular": False, "features": {"premiumVoices": False, "prioritySupport": False, "apiAccess": False}},
            {"id": "pro", "name": "pro", "displayName": "Pro", "price": 19.99, "minutesLimit": 500, "voicesLimit": 50, "popular": True, "features": {"premiumVoices": True, "prioritySupport": True, "apiAccess": True}},
            {"id": "team", "name": "team", "displayName": "Team", "price": 49.99, "minutesLimit": 9999, "voicesLimit": 999, "popular": False, "features": {"premiumVoices": True, "prioritySupport": True, "apiAccess": True}},
        ]
    }

@app.get("/api/subscriptions/current")
async def get_current_subscription(request: Request):
    user_id = get_authorized_user_id(request)
    conn = get_db_connection()
    try:
        try:
            user = conn.execute(
                "SELECT subscription_level, subscription_expires FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
        except sqlite3.OperationalError:
            user = None
        level = (_db_row_get(user, "subscription_level") or "").strip().lower() or None
        expires = _db_row_get(user, "subscription_expires")
        if level in (None, "", "free"):
            inf_plan, inf_exp = _infer_subscription_from_transactions(conn, str(user_id))
            if inf_plan and inf_exp and not _subscription_is_past(conn, inf_exp):
                level, expires = inf_plan, inf_exp
                try:
                    conn.execute(
                        "UPDATE users SET subscription_level = ?, subscription_expires = ? WHERE id = ?",
                        (level, expires, user_id),
                    )
                    conn.commit()
                except Exception as e:
                    print(f"⚠️ sync subscription from transactions: {e}", flush=True)
            else:
                level, expires = "free", None
        elif level != "free" and expires and _subscription_is_past(conn, expires):
            try:
                conn.execute(
                    "UPDATE users SET subscription_level = 'free', subscription_expires = NULL WHERE id = ?",
                    (user_id,),
                )
                conn.commit()
            except Exception as e:
                print(f"⚠️ expire subscription cleanup: {e}", flush=True)
            level, expires = "free", None
        if not level:
            level = "free"
        minutes_used = round(_minutes_used_for_user(conn, str(user_id)), 2)
        limit = int(SUBSCRIPTION_PLAN_MINUTES.get(level, SUBSCRIPTION_PLAN_MINUTES["free"]))
        pct = min(100.0, (minutes_used / limit) * 100.0) if limit > 0 else 0.0
        paid_active = level != "free" and (not expires or not _subscription_is_past(conn, expires))
        return {
            "active": paid_active,
            "plan_id": level,
            "expires_at": expires,
            "status": "active" if paid_active else "free",
            "usage": {"minutesUsed": minutes_used, "minutesLimit": limit, "usagePercent": pct},
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ get_current_subscription: {e}", flush=True)
        return {
            "active": False,
            "plan_id": "free",
            "expires_at": None,
            "status": "free",
            "usage": {"minutesUsed": 0, "minutesLimit": 60, "usagePercent": 0},
        }
    finally:
        conn.close()

@app.post("/api/subscriptions/purchase")
async def purchase_subscription(req: SubscriptionPurchaseRequest, request: Request):
    user_id = get_authorized_user_id(request)
    plan = (req.planName or "").strip().lower()
    if plan not in SUBSCRIPTION_PLAN_PRICES_USD:
        raise HTTPException(status_code=400, detail="Неизвестный тариф")
    price = float(SUBSCRIPTION_PLAN_PRICES_USD[plan])
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT COALESCE(balance, 0) AS b FROM users WHERE id = ?", (user_id,)).fetchone()
        bal = float(_db_row_get(row, "b", 0) or 0)
        if bal + 1e-6 < price:
            raise HTTPException(status_code=400, detail="Недостаточно средств на балансе")
        new_bal = bal - price
        exp_row = conn.execute("SELECT datetime('now', ?)", (f"+{int(SUBSCRIPTION_PERIOD_DAYS)} days",)).fetchone()
        new_exp = exp_row[0] if exp_row else None
        conn.execute(
            "UPDATE users SET balance = ?, subscription_level = ?, subscription_expires = ? WHERE id = ?",
            (new_bal, plan, new_exp, user_id),
        )
        label = "Pro" if plan == "pro" else "Team" if plan == "team" else "Бизнес"
        conn.execute(
            "INSERT INTO transactions (user_id, amount, description, type) VALUES (?, ?, ?, ?)",
            (str(user_id), -abs(price), f"Покупка тарифа {label}", "subscription_purchase"),
        )
        conn.commit()
        return {"ok": True, "message": f"Тариф {label} активирован до {new_exp}", "plan_id": plan, "expires_at": new_exp}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"❌ purchase_subscription: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Ошибка оформления подписки")
    finally:
        conn.close()

@app.post("/api/control")
async def api_control(request: Request, body: dict, background_tasks: BackgroundTasks):
    action = body.get("action"); print(f"🎮 Получена команда: {action}", flush=True)
    try:
        if action == "start":
            await engine.start()
            return {"status": "started", "message": "Аудио-движок запущен"}
        elif action == "stop":
            await engine.stop()
            try:
                uid = get_authorized_user_id(request)
                msgs = engine.export_history_for_archive()
                if msgs:
                    msgs_copy = list(msgs)
                    background_tasks.add_task(_persist_session_background, uid, msgs_copy)
            except HTTPException:
                pass
            return {"status": "stopped", "message": "Аудио-движок остановлен"}
        else: return {"status": "error", "message": f"Неизвестная команда: {action}"}
    except Exception as e: print(f"❌ Ошибка выполнения команды {action}: {e}", flush=True); raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/conversations")
async def list_user_conversations(request: Request, limit: int = 50):
    user_id = get_authorized_user_id(request)
    lim = max(1, min(int(limit or 50), 100))
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT id, created_at, title, message_count FROM conversation_sessions WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT ?",
            (str(user_id), lim)
        ).fetchall()
        return {"sessions": [{"id": r["id"], "created_at": r["created_at"], "title": r["title"] or "Беседа", "message_count": r["message_count"]} for r in rows]}
    finally:
        conn.close()

@app.get("/api/user/conversations/{session_id}")
async def get_user_conversation(session_id: int, request: Request):
    user_id = get_authorized_user_id(request)
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT id, user_id, created_at, title, message_count, messages_json FROM conversation_sessions WHERE id = ? AND user_id = ?",
            (session_id, str(user_id))
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        try:
            messages = json.loads(row["messages_json"])
        except Exception:
            messages = []
        return {
            "id": row["id"],
            "created_at": row["created_at"],
            "title": row["title"] or "Беседа",
            "message_count": row["message_count"],
            "messages": messages
        }
    finally:
        conn.close()

# ================= 🎤 VOICE ENDPOINTS =================
@app.post("/api/conference-mode")
async def set_conference_mode(request: Request, req: ConferenceModeRequest):
    try: print(f"🔁 conference-mode: enabled={req.enabled}", flush=True); engine.set_conference_mode(req.enabled); return {"status": "ok", "conference_mode": req.enabled}
    except Exception as e: print(f"❌ Ошибка conference-mode: {e}", flush=True); raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/translation-pause")
async def set_translation_pause(req: TranslationPauseRequest):
    try:
        engine.set_translation_paused(req.paused)
        return {"status": "ok", "translation_paused": engine.translation_paused}
    except Exception as e:
        print(f"❌ translation-pause: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/voice")
async def voice_message(req: VoiceRequest, request: Request):
    try:
        authorized_user_id = get_authorized_user_id(request)
        cm = bool(req.clone_via_modal)
        print(f"🔊 voice_message: msg_id={req.msg_id}, voice={req.voice}, user_id={authorized_user_id}, clone_via_modal={cm}", flush=True)
        if req.msg_id: result = await engine.voice_message(req.msg_id, req.text, req.msg_type or "statement", voice_override=req.voice, user_id=authorized_user_id, clone_via_modal=cm); print(f"✅ voice_message result: {result}", flush=True); return result
        next_msg = engine.get_next_unvoiced()
        if not next_msg: return {"status": "no_unvoiced_messages"}
        result = await engine.voice_message(next_msg["id"], req.text, req.msg_type or next_msg.get("msg_type", "statement"), voice_override=req.voice, user_id=authorized_user_id, clone_via_modal=cm)
        print(f"✅ voice_message result: {result}", flush=True); return result
    except Exception as e: print(f"❌ Ошибка voice_message: {e}", flush=True); raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 60)
    print("🎤 Voice Translator — Hybrid STT Server")
    print("=" * 60)
    if AITUNNEL_READY:
        print(f"✅ AITunnel API ключ настроен — режим Pro использует: {AITUNNEL_TRANSCRIBE_MODEL}")
    else:
        print("⚠️ AITunnel API ключ НЕ настроен — режим Pro будет использовать fallback")
    print(f"🎯 Pro-режим: ТОЛЬКО модель {AITUNNEL_TRANSCRIBE_MODEL}")
    print("=" * 60 + "\n")
    # Передаём app объектом — иначе uvicorn снова импортирует модуль и Vosk/AudioEngine инициализируются дважды
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False, log_level="warning")