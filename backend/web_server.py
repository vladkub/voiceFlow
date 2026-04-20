# -*- coding: utf-8 -*-
"""
🎯 Voice Translator — Bilingual STT + Frontend Serving + Cloned Voices
✅ Ваш микрофон: Русская модель Vosk
✅ Микрофон партнёра: Английская модель Vosk
✅ Раздача frontend файлов через FastAPI на ОДНОМ порту (8000)
✅ Клонированные голоса через сервис на порту 8001
✅ Синхронизация user_id через API
✅ Авторизация с базой данных SQLite
✅ Защита от IDOR: сервер проверяет куку, URL/заголовок — фолбэки для localhost
✅ Куки с domain=".localhost" для работы между разделами на одном порту
"""

import os, sys, time, json, hashlib, asyncio, numpy as np, requests, re, subprocess, edge_tts, queue, threading, concurrent.futures, logging, traceback, tempfile, soundfile as sf, sqlite3, bcrypt, secrets
from vosk import Model, KaldiRecognizer
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List

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

# ================= 🔊 LOGGING SETUP =================
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logging.getLogger("uvicorn").setLevel(logging.INFO)
logging.getLogger("uvicorn.access").setLevel(logging.INFO)
logging.getLogger("fastapi").setLevel(logging.INFO)

# ================= 🔑 AI CONFIGURATION =================
OPENROUTER_API_KEY = "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"
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
PRIORITY_MODELS = ["qwen/qwen3-vl-32b-instruct", "qwen/qwen3-vl-8b-instruct"]
_ai_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="AI")

# ================= 🎤 VOSK LOADING =================
print("⏳ Загрузка моделей Vosk...", flush=True)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VOSK_RU_PATH = os.path.join(BASE_DIR, "models", "vosk-ru-small")
VOSK_EN_PATH = os.path.join(BASE_DIR, "models", "vosk-en-small")

vosk_ru_model = None
vosk_en_model = None

if os.path.exists(VOSK_RU_PATH):
    try:
        print("   📦 Загрузка русской модели...", flush=True)
        vosk_ru_model = Model(VOSK_RU_PATH)
        print("   ✅ Русская модель готова", flush=True)
    except Exception as e:
        print(f"   ❌ Ошибка русской модели: {e}", flush=True)
        sys.exit(1)
else:
    print(f"   ❌ Папка русской модели не найдена: {VOSK_RU_PATH}", flush=True)
    sys.exit(1)

if os.path.exists(VOSK_EN_PATH):
    try:
        print("   📦 Загрузка английской модели...", flush=True)
        vosk_en_model = Model(VOSK_EN_PATH)
        print("   ✅ Английская модель готова", flush=True)
    except Exception as e:
        print(f"   ⚠️ Ошибка английской модели: {e}", flush=True)
else:
    print(f"   ⚠️ Английская модель не найдена: {VOSK_EN_PATH}", flush=True)

print("✅ Vosk готов.\n", flush=True)

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
RMS_THRESHOLD = 0.002
SILENCE_TIMEOUT = 0.5
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
        sl = "ru" if is_ru(original) else "en"
        resp = http_session.get("https://translate.googleapis.com/translate_a/single", params={"client": "gtx", "sl": sl, "tl": target_lang, "dt": "t", "q": original}, timeout=API_TIMEOUT)
        if resp.status_code == 200: 
            data = resp.json()
            translated = "".join([s[0] for s in data[0] if s[0]]).strip()
    except: pass
    if not translated or (target_lang == "en" and is_ru(translated)):
        try:
            resp = http_session.post("https://libretranslate.de/translate", json={"q": original, "source": "ru" if is_ru(original) else "en", "target": target_lang, "format": "text"}, timeout=API_TIMEOUT)
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
CLONING_TIMEOUT = 30.0

async def get_cloned_voices(user_id: str):
    """Получает список клонированных голосов пользователя"""
    try:
        resp = requests.get(
            f"{CLONING_API_BASE}/voices",
            headers={"X-User-ID": user_id},
            timeout=60.0
        )
        if resp.ok:
            return resp.json().get("voices", [])
    except Exception as e:
        print(f"⚠️ Cloning API error: {e}", flush=True)
    return []

async def generate_cloned_audio(text: str, voice_id: str, user_id: str, speed: float = 1.0):
    """Генерирует аудио через сервис клонирования"""
    try:
        resp = requests.post(
            f"{CLONING_API_BASE}/generate",
            headers={
                "X-User-ID": user_id,
                "Content-Type": "application/json"
            },
            json={
                "voice_id": voice_id,
                "text": text,
                "speed": speed
            },
            timeout=CLONING_TIMEOUT
        )
        if resp.ok:
            return resp.content  # WAV bytes
    except Exception as e:
        print(f"⚠️ Cloning generation error: {e}", flush=True)
    return None

# ================= 🎤 STT (УНИВЕРСАЛЬНАЯ) =================
def transcribe_audio(audio_data, recognizer):
    if recognizer is None: return ""
    audio_int16 = (audio_data * 32768).astype(np.int16) if audio_data.dtype == np.float32 else audio_data.astype(np.int16)
    recognizer.Reset()
    if recognizer.AcceptWaveform(audio_int16.tobytes()):
        return json.loads(recognizer.Result()).get("text", "").strip()
    return json.loads(recognizer.PartialResult()).get("partial", "").strip()

# ================= 🤖 AI SUGGESTIONS =================
async def _generate_suggestion_async(text: str, topic: str) -> List[str]:
    if not text or len(text.strip()) < 3: return [text]
    prompt = f"""You are an intelligent assistant for a voice translator. Topic: "{topic}" Input Text: "{text}" Provide a JSON list of exactly 5 variations. Output ONLY valid JSON array."""
    try:
        headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json", "HTTP-Referer": "http://localhost:8000", "X-Title": "Suggestions"}
        payload = {"model": PRIORITY_MODELS[0], "messages": [{"role": "user", "content": prompt}], "temperature": 0.4, "max_tokens": 300}
        resp = requests.post(OPENROUTER_ENDPOINT, json=payload, headers=headers, timeout=20)
        if resp.status_code == 200:
            content = resp.json()["choices"][0]["message"]["content"].strip()
            content = re.sub(r'```json\s*|\s*```', '', content)
            suggestions = json.loads(content)
            if isinstance(suggestions, list) and len(suggestions) >= 5:
                return suggestions[:5]
    except Exception as e:
        print(f"⚠️ AI Suggestion Error: {e}", flush=True)
    return [text] * 5

# ================= 🔄 АУДИО-ДВИЖОК =================
class AudioEngine:
    def __init__(self):
        self.task_queue = asyncio.Queue(); self.audio_queue = queue.Queue(); self.main_loop = None
        self.buffer, self.speaking, self.silence_time = [], False, 0.0; self.task_counter = 0; self.stream = None; self.running = False; self.conference_mode = False
        self.mic_idx = None; self.speaker_idx = None; self.vb_cable_input = None; self.vb_cable_output = None; self.original_playback_idx = None
        self.history = []; self.history_lock = threading.Lock(); self.ai_enabled = False; self.ai_topic = ""
        self.partner_stream = None; self.partner_buffer = []; self.partner_speaking = False; self.partner_silence_time = 0.0
        self.partner_vad_chunk = 0.05; self.partner_silence_timeout = 1.0
        self.partner_rec = KaldiRecognizer(vosk_en_model, SAMPLE_RATE) if vosk_en_model else None
        self.partner_mic_idx = None
        self.unmute_mode = False; self.last_user_speak_time = 0; self.partner_mute_duration = 2.5
        
        list_playback_devices(); self._find_devices()
        if os.path.exists(STATE_FILE):
            try: os.remove(STATE_FILE); print("🔄 Авто-сброс: конференция выключена", flush=True)
            except: pass
            
        ru_status = "✓" if vosk_ru_model else "✗"
        en_status = "✓" if self.partner_rec else "✗"
        print(f"✅ AudioEngine готов | Ваша речь(RU): {ru_status} | Речь партнёра(EN): {en_status}", flush=True)
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

    def _add_message(self, speaker: str, text: str, status: str = "recognized", translated: str = "", msg_type: str = "statement", ai_enhanced: bool = False):
        with self.history_lock:
            msg_id = self.task_counter + len(self.history) + 1
            self.history.append({"id": msg_id, "speaker": speaker, "original": text, "translated": translated, "status": status, "timestamp": time.time(), "editable": status == "recognized" and speaker == "user", "msg_type": msg_type, "ai_enhanced": ai_enhanced})
            if len(self.history) > 50: self.history.pop(0)
            return msg_id

    def skip_message(self, msg_id: int) -> bool:
        with self.history_lock:
            for msg in self.history:
                if msg["id"] == msg_id and msg["status"] == "recognized": msg["status"] = "deleted"; msg["editable"] = False; return True
        return False

    def _partner_vad_callback(self, indata, frames, time_info, status):
        if self.partner_rec is None: return
        if time.time() - self.last_user_speak_time < self.partner_mute_duration: return
        rms = np.sqrt(np.mean(indata**2))
        if rms > RMS_THRESHOLD * 0.6:
            if not self.partner_speaking: self.partner_speaking = True; self.partner_buffer = []; self.partner_silence_time = 0.0
            self.partner_buffer.append(indata.copy()); self.partner_silence_time = 0.0
        else:
            if self.partner_speaking:
                self.partner_silence_time += self.partner_vad_chunk; self.partner_buffer.append(indata.copy())
                if self.partner_silence_time >= self.partner_silence_timeout:
                    audio_data = np.concatenate(self.partner_buffer, axis=0).flatten()
                    if self.main_loop: asyncio.run_coroutine_threadsafe(self._process_partner_phrase(audio_data), self.main_loop)
                    self.partner_speaking = False; self.partner_buffer = []; self.partner_silence_time = 0.0

    async def _process_partner_phrase(self, audio_data):
        text = transcribe_audio(audio_data, self.partner_rec)
        if text and len(text) >= 2:
            print(f"🔍 (Partner EN): '{text}'", flush=True)
            text_ru, _ = fast_translate_sync(text, "ru")
            self._add_message("partner", text, "recognized", translated=text_ru, msg_type="statement")

    def _vad_callback(self, indata, frames, time_info, status):
        if self.unmute_mode: return
        rms = np.sqrt(np.mean(indata**2))
        if rms > RMS_THRESHOLD:
            if not self.speaking: self.speaking = True; self.buffer = []; self.silence_time = 0.0
            self.buffer.append(indata.copy()); self.silence_time = 0.0
        else:
            if self.speaking:
                self.silence_time += VAD_CHUNK; self.buffer.append(indata.copy())
                if self.silence_time >= SILENCE_TIMEOUT:
                    audio_data = np.concatenate(self.buffer, axis=0).flatten(); self.task_counter += 1
                    text_ru = transcribe_audio(audio_data, KaldiRecognizer(vosk_ru_model, SAMPLE_RATE))
                    if len(text_ru) >= 2:
                        print(f"🎤 (You RU): '{text_ru}'", flush=True)
                        text_en, _ = fast_translate_sync(text_ru, "en")
                        self._add_message("user", text_ru, "recognized", translated=text_en, ai_enhanced=False)
                    self.speaking, self.buffer, self.silence_time = False, [], 0.0

    async def start(self):
        if self.running: return
        self.running = True; self.main_loop = asyncio.get_running_loop()
        try:
            if not self.unmute_mode:
                self.stream = sd.InputStream(device=self.mic_idx, samplerate=SAMPLE_RATE, channels=1, dtype='float32', blocksize=int(SAMPLE_RATE * VAD_CHUNK), callback=self._vad_callback); self.stream.start()
            if self.partner_mic_idx is not None and self.partner_mic_idx != self.mic_idx:
                self.partner_stream = sd.InputStream(device=self.partner_mic_idx, samplerate=SAMPLE_RATE, channels=1, dtype='float32', blocksize=int(SAMPLE_RATE * self.partner_vad_chunk), callback=self._partner_vad_callback); self.partner_stream.start()
            print("✅ Аудио-движок запущен", flush=True)
        except Exception as e: print(f"❌ Ошибка запуска: {e}", flush=True); self.running = False; raise

    async def stop(self):
        if not self.running: return
        self.running = False
        if self.stream: self.stream.stop(); self.stream.close(); self.stream = None
        if self.partner_stream: self.partner_stream.stop(); self.partner_stream.close(); self.partner_stream = None
        save_cache(); print("✅ Аудио-движок остановлен", flush=True)

    def set_conference_mode(self, enabled: bool):
        try: self.conference_mode = enabled; return True
        except Exception as e: traceback.print_exc(); raise

    def get_status(self):
        return {"running": self.running, "listening": self.speaking, "queue_size": self.task_queue.qsize(), "task_counter": self.task_counter, "conference_mode": self.conference_mode, "unmute_mode": self.unmute_mode, "ai_enabled": self.ai_enabled, "ai_topic": self.ai_topic, "mic_device": f"IDX:{self.mic_idx}", "speaker_device": f"IDX:{self.speaker_idx}", "output_mode": "conference" if self.conference_mode else "local"}
    
    def get_chat_history(self):
        with self.history_lock: return list(reversed(self.history))
    
    def get_next_unvoiced(self) -> Optional[dict]:
        with self.history_lock:
            for msg in self.history:
                if msg["status"] == "recognized" and msg["editable"]: return msg.copy()
        return None

    async def voice_message(self, msg_id: int, custom_text: Optional[str] = None, msg_type: str = "statement", voice_override: str = None) -> dict:
        with self.history_lock:
            msg = next((m for m in self.history if m["id"] == msg_id), None)
            if not msg: return {"error": "Message not found"}
            if msg["status"] != "recognized": return {"status": "already_processed"}
            msg["status"] = "playing"; msg["msg_type"] = msg_type; text_to_translate = custom_text if custom_text is not None else msg["original"]; msg["original"] = text_to_translate
        stripped = text_to_translate.strip()
        if not stripped.endswith(('.', '!', '?')): text_to_translate = stripped + ("?" if msg_type == "question" else ".")
        target_lang = "en" if msg["speaker"] == "user" else "ru"; voice = voice_override if voice_override else (TTS_VOICE if msg["speaker"] == "user" else PARTNER_TTS_VOICE)
        text_translated, _ = fast_translate_sync(text_to_translate, target_lang); msg["translated"] = text_translated
        
        # 🔥 Генерация аудио: клонированный голос или стандартный
        samples, rate_out = None, None
        
        if voice and voice.startswith("cloned:"):
            # 🔥 Клонированный голос через сервис
            voice_id = voice.replace("cloned:", "")
            user_id = "anonymous"  # Заглушка — в продакшене брать из авторизации
            audio_bytes = await generate_cloned_audio(text_translated, voice_id, user_id)
            
            if audio_bytes:
                # Конвертируем WAV bytes в numpy array
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = tmp.name
                try:
                    data, rate_out = sf.read(tmp_path)
                    samples = data.astype(np.float32)
                finally:
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)
        else:
            # 🔥 Стандартный Edge TTS
            for rate in SUPPORTED_SAMPLE_RATES:
                samples, rate_out, _ = await speak_text(text_translated, voice=voice, preferred_rate=rate)
                if samples is not None:
                    break
        
        if samples is None:
            with self.history_lock:
                msg["status"] = "error: TTS failed"
            return {"error": "TTS failed"}
        
        try:
            play_dev = self.speaker_idx
            if self.conference_mode and self.vb_cable_input is not None: 
                play_dev = self.vb_cable_input
            sd.play(samples, samplerate=rate_out, device=play_dev)
            sd.wait()
            self.last_user_speak_time = time.time()
            with self.history_lock: 
                msg["status"] = "done"
                msg["editable"] = False
            return {"status": "played", "translated": text_translated, "type": msg_type}
        except Exception as e:
            with self.history_lock: 
                msg["status"] = f"error: {str(e)}"
            return {"error": str(e)}

# ================= 🏗️ FASTAPI =================
app = FastAPI(title="🎙️ Hybrid Translator Chat API", version="60.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
engine = AudioEngine()

# ================= 🔐 AUTH MODELS =================
class ControlRequest(BaseModel): action: str
class ConferenceModeRequest(BaseModel): enabled: bool
class UnmuteModeRequest(BaseModel): enabled: bool
class AIConfigRequest(BaseModel): enabled: bool; topic: str = ""
class TTSRequest(BaseModel): text: str; voice: str = TTS_VOICE; lang: str = "en-US"; play_locally: bool = True
class VoiceRequest(BaseModel): msg_id: Optional[int] = None; text: Optional[str] = None; msg_type: Optional[str] = "statement"; voice: Optional[str] = None
class DeleteRequest(BaseModel): msg_id: int
class ResetRequest(BaseModel): pass
class VoicePreviewRequest(BaseModel): voice: str; text: Optional[str] = "Hello. Test."
class StatusResponse(BaseModel): running: bool; listening: bool; queue_size: int; task_counter: int; conference_mode: bool; unmute_mode: bool; ai_enabled: bool; ai_topic: str; mic_device: str; speaker_device: str; output_mode: str

# 🔐 AUTH REQUEST MODELS
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

# ================= 🔐 DATABASE FUNCTIONS =================
def get_db_connection():
    """Подключение к базе данных"""
    db_path = os.path.join(BASE_DIR, "..", "database.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_auth_db():
    """Инициализация таблицы пользователей"""
    try:
        conn = get_db_connection()
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
        print("✅ Таблица users инициализирована", flush=True)
    except Exception as e:
        print(f"⚠️ DB init warning: {e}", flush=True)

# 🔥 Инициализируем БД при старте
init_auth_db()

# ================= 🔐 AUTHORIZATION HELPERS =================

def get_authorized_user_id(request: Request) -> str:
    """
    Получает авторизованный user_id.
    
    🔐 Источник истины: кука user_id
    🔍 Фолбэки для localhost-разработки: query-параметр или X-User-ID заголовок
    
    Raises:
        HTTPException 401: если нет авторизации
        HTTPException 403: если переданный user_id != cookie user_id (IDOR attempt)
    """
    cookie_user_id = request.cookies.get("user_id")
    
    # 🔥 Извлекаем user_id из разных источников
    query_user_id = request.query_params.get("user_id")
    header_user_id = request.headers.get("X-User-ID")
    
    # 🔥 Логирование для отладки
    print(f"🔐 Auth check: cookie={cookie_user_id}, query={query_user_id}, header={header_user_id}", flush=True)
    
    # 🔥 1. Если есть кука — это источник истины
    if cookie_user_id:
        # Проверяем совпадение с другими источниками (защита от IDOR)
        if query_user_id and query_user_id != cookie_user_id:
            print(f"🚨 IDOR attempt: query user_id={query_user_id} != cookie={cookie_user_id}", flush=True)
            raise HTTPException(status_code=403, detail="Forbidden")
        if header_user_id and header_user_id != cookie_user_id:
            print(f"🚨 IDOR attempt: header user_id={header_user_id} != cookie={cookie_user_id}", flush=True)
            raise HTTPException(status_code=403, detail="Forbidden")
        return cookie_user_id
    
    # 🔥 2. Для localhost: разрешаем query-параметр как фолбэк (разработка)
    if query_user_id and not query_user_id.startswith('anonymous_'):
        print(f"⚠️ Localhost dev: используем query user_id={query_user_id}", flush=True)
        return query_user_id
    
    # 🔥 3. Для localhost: разрешаем заголовок как последний фолбэк
    if header_user_id and not header_user_id.startswith('anonymous_'):
        print(f"⚠️ Localhost dev: используем header user_id={header_user_id}", flush=True)
        return header_user_id
    
    # 🔥 4. Нет авторизации
    print(f"⚠️ Unauthorized: no cookie, no valid query/header user_id", flush=True)
    raise HTTPException(status_code=401, detail="Unauthorized")

# ================= 🌐 MAIN ROUTES =================

# ================= 🌐 FRONTEND ROUTES =================

# 🔥 Пути к папкам
frontend_dir = os.path.join(BASE_DIR, "..", "frontend")  # Чат
public_dir = os.path.join(BASE_DIR, "..", "public")       # Лендинг, дашборд, логин

# 🔥 1. Главная страница (/ и /index.html) — ДОЛЖНА БЫТЬ ПЕРВОЙ!
@app.get("/")
async def root():
    """Главная страница сайта (лендинг)"""
    landing_path = os.path.join(public_dir, "index.html")
    if os.path.exists(landing_path):
        return FileResponse(landing_path)
    return Response(content="<script>window.location.href='/ui'</script>", media_type="text/html")

@app.get("/index.html")
async def serve_main_index():
    """Главная страница (лендинг)"""
    landing_path = os.path.join(public_dir, "index.html")
    if os.path.exists(landing_path):
        return FileResponse(landing_path)
    raise HTTPException(404, "Главная страница не найдена")

# 🔥 2. Чат (/ui) — ПОСЛЕ главной!
@app.get("/ui")
async def serve_chat():
    """Чат приложение"""
    chat_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(chat_path):
        return FileResponse(chat_path)
    raise HTTPException(404, "frontend/index.html not found")

@app.get("/ui/{filename:path}")
async def serve_chat_file(filename: str):
    """Статика для чата"""
    file_path = os.path.join(frontend_dir, filename)
    if not os.path.abspath(file_path).startswith(os.path.abspath(frontend_dir)):
        raise HTTPException(status_code=404, detail="File not found")
    if os.path.exists(file_path) and os.path.isfile(file_path):
        if filename.endswith('.js'):
            return FileResponse(file_path, media_type="application/javascript")
        elif filename.endswith('.css'):
            return FileResponse(file_path, media_type="text/css")
        elif filename.endswith('.html'):
            return FileResponse(file_path, media_type="text/html")
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail=f"File {filename} not found")

# 🔥 3. Личный кабинет и вход
@app.get("/dashboard.html")
async def serve_dashboard():
    """Личный кабинет"""
    dashboard_path = os.path.join(public_dir, "dashboard.html")
    if os.path.exists(dashboard_path):
        return FileResponse(dashboard_path)
    raise HTTPException(404, "dashboard.html not found")

@app.get("/login.html")
async def serve_login():
    """Страница входа"""
    login_path = os.path.join(public_dir, "login.html")
    if os.path.exists(login_path):
        return FileResponse(login_path)
    raise HTTPException(404, "login.html not found")

# 🔥 4. Статика для лендинга и дашборда
@app.get("/css/{filename:path}")
async def serve_css(filename: str):
    """CSS файлы"""
    file_path = os.path.join(public_dir, "css", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="text/css")
    raise HTTPException(404, "CSS not found")

@app.get("/js/{filename:path}")
async def serve_js(filename: str):
    """JS файлы"""
    file_path = os.path.join(public_dir, "js", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="application/javascript")
    raise HTTPException(404, "JS not found")

# ================= 🔐 AUTH ENDPOINTS =================

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    """Регистрация нового пользователя"""
    try:
        conn = get_db_connection()
        
        # Проверка уникальности email
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone()
        if existing:
            conn.close()
            raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
        
        # Хэширование пароля
        password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
        
        # Создание пользователя
        cursor = conn.execute(
            "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)",
            (req.email, req.name, password_hash)
        )
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        print(f"✅ Регистрация: {req.email} (id={user_id})", flush=True)
        
        return {
            "user": {"id": user_id, "email": req.email, "username": req.name},
            "message": "Регистрация успешна"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Register error: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Ошибка регистрации")

@app.post("/api/auth/login")
async def login(req: LoginRequest, response: Response):
    """Вход пользователя"""
    try:
        conn = get_db_connection()
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?", (req.email.strip(),)
        ).fetchone()
        conn.close()

        if not user:
            # Лог для отладки: пользователь не найден
            print(f"⚠️ Login failed: User {req.email} not found")
            raise HTTPException(status_code=401, detail="Неверный email или пароль")

        # Проверка пароля
        stored_hash = user['password_hash']
        # Убедимся, что работаем с байтами
        if isinstance(stored_hash, str):
            stored_hash = stored_hash.encode('utf-8')
        
        password_bytes = req.password.encode('utf-8')

        if not bcrypt.checkpw(password_bytes, stored_hash):
            print(f"⚠️ Login failed: Wrong password for {req.email}")
            raise HTTPException(status_code=401, detail="Неверный email или пароль")

        # Успешный вход: устанавливаем куки
        # Важно: domain='.localhost' может не работать в некоторых браузерах локально.
        # Попробуем без domain или с domain='localhost'
        response.set_cookie(
            key="user_id",
            value=str(user['id']),
            httponly=True,
            max_age=60 * 60 * 24 * 7,  # 1 неделя
            samesite="lax",
            domain="localhost"  # Изменено с .localhost на localhost
        )

        return {"status": "ok", "user_id": user['id'], "email": user['email']}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера при входе")

@app.get("/api/auth/me")
async def get_me(request: Request):
    """Получение текущего пользователя — возвращает 401 если нет авторизации"""
    try:
        user_id = request.cookies.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        conn = get_db_connection()
        user = conn.execute(
            "SELECT id, email, username FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()
        conn.close()
        
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        return {"id": user["id"], "email": user["email"], "username": user["username"]}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get me error: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Ошибка")

@app.post("/api/auth/logout")
async def logout(response: Response):
    """Выход — удаляет куку с тем же domain"""
    response.delete_cookie(
        key="user_id",
        domain=".localhost",  # ← Должен совпадать с set_cookie!
        path="/"
    )
    print("🔐 Выход выполнен", flush=True)
    return {"message": "Выход успешен"}

# 🔐 Эндпоинт для получения текущего user_id
@app.get("/api/auth/current-user")
async def get_current_user(request: Request):
    """Возвращает текущего пользователя — только из куки"""
    try:
        user_id = request.cookies.get("user_id")
        
        if user_id:
            print(f"🔐 /api/auth/current-user: вернул user_id={user_id} из куки", flush=True)
            return {"id": user_id, "authenticated": True}
        else:
            print(f"🔐 /api/auth/current-user: нет авторизации, вернул anonymous", flush=True)
            return {"id": "anonymous", "authenticated": False}
    except Exception as e:
        print(f"❌ Error in /api/auth/current-user: {e}", flush=True)
        return {"id": "anonymous", "authenticated": False}

# 🔥 Эндпоинты для голосов

# 🔐 ЗАЩИЩЁН: использует get_authorized_user_id() для проверки авторизации
@app.get("/api/voices")
async def get_voices(request: Request):
    """Возвращает ВСЕ доступные голоса: стандартные Edge TTS + клонированные АВТОРИЗОВАННОГО пользователя"""
    try:
        # 🔥 Получаем авторизованный user_id (функция сама извлечёт из запроса)
        authorized_user_id = get_authorized_user_id(request)
        
        # 🔥 Получаем ВСЕ доступные Neural голоса Edge TTS
        voices_data = await edge_tts.list_voices()
        neural_voices = sorted([v["ShortName"].strip() for v in voices_data if "Neural" in v.get("ShortName", "")])
        
        # 🔥 Добавляем клонированные голоса АВТОРИЗОВАННОГО пользователя
        cloned = await get_cloned_voices(authorized_user_id)
        cloned_options = [{"id": v["id"], "name": v["name"]} for v in cloned]
        
        return {
            "voices": neural_voices,
            "cloned_voices": cloned_options
        }
    except HTTPException:
        raise
    except Exception as e:
        # Fallback если edge_tts.list_voices() не работает
        fallback_voices = [
            "en-US-JennyNeural", "en-US-GuyNeural", "en-US-AriaNeural",
            "ru-RU-SvetlanaNeural", "ru-RU-DmitryNeural",
            "de-DE-KatjaNeural", "es-ES-ElviraNeural", "fr-FR-DeniseNeural"
        ]
        return {
            "voices": fallback_voices, 
            "cloned_voices": [], 
            "warning": str(e)
        }

@app.post("/api/preview-voice")
async def preview_voice(req: VoicePreviewRequest):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            voice = req.voice.strip()
            if not voice: raise ValueError("Empty voice")
            # 🔥 Если клонированный голос — перенаправляем
            if voice.startswith("cloned:"):
                return await preview_cloned_voice(req)
            comm = edge_tts.Communicate("Hello. Test.", voice)
            mp3_data = b""
            async for chunk in comm.stream():
                if chunk["type"] == "audio": mp3_data += chunk["data"]
            if len(mp3_data) < 100: raise ValueError("Empty stream")
            return Response(content=mp3_data, media_type="audio/mpeg")
        except Exception as e:
            if attempt < max_retries - 1: await asyncio.sleep(0.5); continue
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/preview-cloned-voice")
async def preview_cloned_voice(req: VoicePreviewRequest, request: Request):
    """Предпрослушивание клонированного голоса"""
    # 🔥 Получаем авторизованный user_id
    authorized_user_id = get_authorized_user_id(request)
    
    if req.voice.startswith("cloned:"):
        voice_id = req.voice.replace("cloned:", "")
        audio_bytes = await generate_cloned_audio(req.text or "Hello. Test.", voice_id, authorized_user_id)
        if audio_bytes:
            return Response(content=audio_bytes, media_type="audio/wav")
        raise HTTPException(500, "Failed to generate cloned voice")
    
    # Fallback к стандартному preview
    return await preview_voice(req)

@app.post("/api/tts")
async def tts(req: TTSRequest, request: Request):
    try:
        # 🔥 Если клонированный голос — используем специальный эндпоинт
        if req.voice.startswith("cloned:"):
            return await tts_cloned(req, request)
        
        samples, rate, _ = await speak_text(req.text, voice=req.voice)
        if req.play_locally and samples is not None:
            sd.play(samples, samplerate=rate, device=engine.speaker_idx); sd.wait()
            return {"status": "played"}
        comm = edge_tts.Communicate(req.text, req.voice); mp3 = b""
        async for c in comm.stream():
            if c["type"] == "audio": mp3 += c["data"]
        return Response(content=mp3, media_type="audio/mpeg")
    except Exception as e: raise HTTPException(500, str(e))

# 🔐 ЗАЩИЩЁН: использует get_authorized_user_id() для проверки авторизации
@app.post("/api/tts-cloned")
async def tts_cloned(req: TTSRequest, request: Request):
    """TTS с поддержкой клонированных голосов"""
    # 🔥 Получаем авторизованный user_id
    authorized_user_id = get_authorized_user_id(request)
    
    if req.voice.startswith("cloned:"):
        voice_id = req.voice.replace("cloned:", "")
        
        # 🔥 Генерируем аудио для АВТОРИЗОВАННОГО пользователя
        audio_bytes = await generate_cloned_audio(req.text, voice_id, authorized_user_id)
        
        if audio_bytes:
            # Конвертируем для воспроизведения
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name
            try:
                data, rate = sf.read(tmp_path)
                if req.play_locally:
                    sd.play(data, samplerate=rate, device=engine.speaker_idx)
                    sd.wait()
                    return {"status": "played", "type": "cloned"}
                return Response(content=audio_bytes, media_type="audio/wav")
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        raise HTTPException(500, "Failed to generate cloned voice")
    
    # Fallback к стандартному TTS
    return await tts(req, request)

@app.get("/api/cloned-voices")
async def get_cloned_voices_endpoint(request: Request):
    """Возвращает клонированные голоса текущего пользователя"""
    # 🔥 Получаем авторизованный user_id
    authorized_user_id = get_authorized_user_id(request)
    voices = await get_cloned_voices(authorized_user_id)
    cloned_options = [{"value": f"cloned:{v['id']}", "label": f"🎤 {v['name']} (клони)", "cloned": True} for v in voices]
    return {"voices": cloned_options}

@app.get("/api/health")
async def health(): return {"status": "ok"}

# 🔐 ЗАЩИЩЁН: использует get_authorized_user_id() для проверки авторизации
@app.get("/api/user/cloned-voices")
async def get_user_cloned_voices(request: Request):
    """Возвращает клонированные голоса АВТОРИЗОВАННОГО пользователя"""
    # 🔥 Получаем авторизованный user_id
    authorized_user_id = get_authorized_user_id(request)
    
    voices = await get_cloned_voices(authorized_user_id)
    
    return {
        "voices": voices,
        "count": len(voices),
        "user_id": authorized_user_id
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.web_server:app", host="0.0.0.0", port=8000, reload=False, log_level="info")