"""Dedicated heavy-inference service for a Colab GPU runtime."""

from __future__ import annotations

import asyncio
import base64
import os
import hmac
import tempfile
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status


app = FastAPI(title="Jungle Market Colab ML Server", version="1.0.0")


def require_api_key(
    supplied_key: Annotated[str | None, Header(alias="X-ML-API-Key")] = None,
) -> None:
    configured_key = os.getenv("COLAB_ML_API_KEY", "").strip()
    if not configured_key or not hmac.compare_digest(supplied_key or "", configured_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ML service API key",
        )


def whisper_runtime() -> tuple[str, str]:
    requested_device = os.getenv("WHISPER_DEVICE", "auto").lower()
    if requested_device != "auto":
        device = requested_device
    else:
        try:
            import ctranslate2

            device = "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"
        except Exception:
            device = "cpu"
    default_compute_type = "float16" if device == "cuda" else "int8"
    return device, os.getenv("WHISPER_COMPUTE_TYPE", default_compute_type)


@lru_cache(maxsize=1)
def rembg_session():
    import rembg

    return rembg.new_session(os.getenv("REMBG_MODEL", "u2net"))


@lru_cache(maxsize=1)
def whisper_model():
    from faster_whisper import WhisperModel

    device, compute_type = whisper_runtime()
    return WhisperModel(
        os.getenv("WHISPER_MODEL_SIZE", "small"),
        device=device,
        compute_type=compute_type,
    )


def remove_background(image_bytes: bytes) -> bytes:
    from rembg import remove

    return remove(image_bytes, session=rembg_session())


def transcribe_audio(audio_bytes: bytes, source_language: str, task: str = "transcribe") -> dict[str, object]:
    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            temp_audio.write(audio_bytes)
            temp_path = temp_audio.name

        segments, info = whisper_model().transcribe(
            temp_path,
            beam_size=int(os.getenv("WHISPER_BEAM_SIZE", "3")),
            language=source_language or None,
            task=task,
            vad_filter=True,
        )
        transcript = " ".join(segment.text.strip() for segment in segments).strip()
        return {
            "transcript": transcript,
            "language": info.language,
            "confidence": float(info.language_probability),
        }
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except FileNotFoundError:
                pass


@app.get("/health")
async def health() -> dict[str, object]:
    device, compute_type = whisper_runtime()
    return {
        "status": "ok",
        "service": "jungle-market-colab-ml",
        "capabilities": ["rembg", "whisper", "translate-audio"],
        "whisper": {
            "model": os.getenv("WHISPER_MODEL_SIZE", "small"),
            "device": device,
            "compute_type": compute_type,
            "loaded": whisper_model.cache_info().currsize > 0,
        },
        "rembg": {
            "model": os.getenv("REMBG_MODEL", "u2net"),
            "loaded": rembg_session.cache_info().currsize > 0,
        },
    }


@app.post("/ml/rembg", dependencies=[Depends(require_api_key)])
async def process_rembg(file: UploadFile = File(...)) -> dict[str, str]:
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Must be an image file")
    try:
        data = await file.read(15 * 1024 * 1024 + 1)
        if not data or len(data) > 15 * 1024 * 1024:
            raise HTTPException(413, "Image must be between 1 byte and 15 MB.")
        clean_image = await asyncio.to_thread(remove_background, data)
        encoded = base64.b64encode(clean_image).decode("ascii")
        return {"clean_bytes_base64": encoded, "scrubbed_b64": encoded}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail="Background removal failed.") from error


@app.post("/ml/whisper", dependencies=[Depends(require_api_key)])
async def process_whisper(
    audio: UploadFile = File(...),
    source_language: str = Form("hi"),
) -> dict[str, object]:
    try:
        data = await audio.read(25 * 1024 * 1024 + 1)
        if not data or len(data) > 25 * 1024 * 1024:
            raise HTTPException(413, "Audio must be between 1 byte and 25 MB.")
        return await asyncio.to_thread(
            transcribe_audio,
            data,
            source_language,
        )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail="Transcription failed.") from error


@app.post("/ml/translate-audio", dependencies=[Depends(require_api_key)])
async def translate_audio(audio: UploadFile = File(...), source_language: str = Form("hi")):
    data = await audio.read(25 * 1024 * 1024 + 1)
    if not data or len(data) > 25 * 1024 * 1024:
        raise HTTPException(413, "Audio must be between 1 byte and 25 MB.")
    try:
        result = await asyncio.to_thread(transcribe_audio, data, source_language, "translate")
        return {"translated_text": result["transcript"], "target_language": "en", "status": "review_required"}
    except Exception as error:
        raise HTTPException(503, "Audio translation unavailable.") from error
