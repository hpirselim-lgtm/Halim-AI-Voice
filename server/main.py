import io
import os
import secrets
import threading
import time
import wave
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from pydantic import BaseModel, Field

DATA_DIR = Path(os.getenv("DATA_DIR", "/data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
VOICE_DIR = DATA_DIR / "voice"
VOICE_DIR.mkdir(parents=True, exist_ok=True)
VOICE_FILE = VOICE_DIR / "reference_audio.wav"

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_TEXT_CHARS = 2500
TOKEN_MAX_AGE = 12 * 60 * 60
APP_PASSWORD = os.getenv("APP_PASSWORD", "")
TOKEN_SECRET = os.getenv("TOKEN_SECRET", "")
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "https://hpirselim-lgtm.github.io")

serializer = URLSafeTimedSerializer(TOKEN_SECRET or "not-configured", salt="halim-ai-voice-session")
app = FastAPI(
    title="Halim AI Voice API",
    version="0.2.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

_model = None
_voice = None
_model_lock = threading.Lock()
_generation_lock = threading.Lock()
_login_lock = threading.Lock()
_login_attempts = {}
LOGIN_WINDOW_SECONDS = 15 * 60
MAX_LOGIN_FAILURES = 5


class LoginBody(BaseModel):
    password: str = Field(min_length=1, max_length=256)


class SynthesisBody(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS)
    emotion: Optional[str] = Field(
        default=None,
        pattern="^(mutlu|üzgün|kızgın|şaşkın|sakin)$",
    )


def require_config():
    if not APP_PASSWORD or len(TOKEN_SECRET) < 32:
        raise HTTPException(
            status_code=503,
            detail="Sunucu güvenlik ayarları tamamlanmamış.",
        )


def current_user(authorization: Optional[str] = Header(default=None)):
    require_config()
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Oturum açmalısın.")
    try:
        data = serializer.loads(
            authorization[7:].strip(),
            max_age=TOKEN_MAX_AGE,
        )
    except SignatureExpired:
        raise HTTPException(
            status_code=401,
            detail="Oturum süresi doldu. Yeniden giriş yap.",
        )
    except BadSignature:
        raise HTTPException(status_code=401, detail="Oturum doğrulanamadı.")
    if data.get("scope") != "owner":
        raise HTTPException(status_code=401, detail="Oturum geçersiz.")
    return True


def get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                os.environ.setdefault("HF_HOME", str(DATA_DIR / "huggingface"))
                from pocket_tts_turkish import TurkishTTS

                _model = TurkishTTS.from_pretrained(device="cpu")
    return _model


def get_voice():
    global _voice
    if not VOICE_FILE.exists():
        raise HTTPException(
            status_code=409,
            detail="Önce kendi ses örneğini yüklemelisin.",
        )
    if _voice is None:
        try:
            _voice = get_model().voice_from_file(str(VOICE_FILE))
        except Exception:
            raise HTTPException(
                status_code=422,
                detail="Sunucudaki ses örneği yeniden işlenemedi. Tekrar yükle.",
            )
    return _voice


def make_wav_bytes(audio, sample_rate):
    samples = np.asarray(audio, dtype=np.float32).reshape(-1)
    samples = np.nan_to_num(samples, nan=0.0, posinf=1.0, neginf=-1.0)
    samples = np.clip(samples, -1.0, 1.0)
    pcm = (samples * 32767.0).astype("<i2")
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(int(sample_rate))
        wav.writeframes(pcm.tobytes())
    return output.getvalue()


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "Halim AI Voice",
        "model_loaded": _model is not None,
    }


@app.post("/api/login")
def login(body: LoginBody, request: Request):
    require_config()
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    with _login_lock:
        attempts = [
            stamp
            for stamp in _login_attempts.get(client_ip, [])
            if now - stamp < LOGIN_WINDOW_SECONDS
        ]
        _login_attempts[client_ip] = attempts
        if len(attempts) >= MAX_LOGIN_FAILURES:
            raise HTTPException(
                status_code=429,
                detail="Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.",
            )
        if not secrets.compare_digest(body.password, APP_PASSWORD):
            attempts.append(now)
            _login_attempts[client_ip] = attempts
            raise HTTPException(status_code=401, detail="Şifre hatalı.")
        _login_attempts.pop(client_ip, None)

    token = serializer.dumps(
        {"scope": "owner", "issued": int(now)},
    )
    return {"token": token, "expires_in": TOKEN_MAX_AGE}


@app.get("/api/status")
def status(_: bool = Depends(current_user)):
    return {
        "authenticated": True,
        "voice_uploaded": VOICE_FILE.exists(),
        "model_loaded": _model is not None,
        "session_expires_in": TOKEN_MAX_AGE,
    }


@app.post("/api/voice")
async def upload_voice(
    file: UploadFile = File(...),
    _: bool = Depends(current_user),
):
    global _voice
    filename = (file.filename or "").lower()
    if not filename.endswith((".wav", ".flac", ".ogg", ".mp3", ".m4a")):
        raise HTTPException(
            status_code=415,
            detail="WAV, FLAC, OGG, MP3 veya M4A dosyası yükle.",
        )

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if not content or len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Ses dosyası boş veya 15 MB sınırını aşıyor.",
        )

    temp = VOICE_DIR / "upload.tmp"
    try:
        temp.write_bytes(content)
        candidate = get_model().voice_from_file(str(temp))
        temp.replace(VOICE_FILE)
        _voice = candidate
    except Exception:
        temp.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail="Ses dosyası işlenemedi. Net, tek kişiye ait 5–10 saniyelik bir örnek dene.",
        )

    return {"ok": True, "message": "Ses örneği sunucuya kaydedildi."}


@app.post("/api/synthesize")
def synthesize(
    body: SynthesisBody,
    _: bool = Depends(current_user),
):
    voice = get_voice()
    try:
        with _generation_lock:
            options = {"voice": voice}
            if body.emotion:
                options["emotion"] = body.emotion
            audio = get_model().generate(body.text.strip(), **options)

        return Response(
            make_wav_bytes(audio, get_model().sample_rate),
            media_type="audio/wav",
            headers={
                "Content-Disposition": 'attachment; filename="halim-ai-voice.wav"',
                "Cache-Control": "no-store",
            },
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Ses üretimi başarısız oldu. Biraz sonra tekrar dene.",
        )


@app.delete("/api/voice")
def delete_voice(_: bool = Depends(current_user)):
    global _voice
    VOICE_FILE.unlink(missing_ok=True)
    (VOICE_DIR / "upload.tmp").unlink(missing_ok=True)
    _voice = None
    return {"ok": True, "message": "Sunucudaki ses örneği silindi."}
