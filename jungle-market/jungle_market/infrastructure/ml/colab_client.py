"""HTTP client for the dedicated Colab heavy-inference service."""

from __future__ import annotations

import base64
from typing import Any

import httpx

from jungle_market.core.config import settings


class ColabMLUnavailable(RuntimeError):
    """Raised when remote inference is disabled or unreachable."""


class ColabMLClient:
    @property
    def configured(self) -> bool:
        return bool(settings.COLAB_ML_URL.strip())

    def _url(self, path: str) -> str:
        if not self.configured:
            raise ColabMLUnavailable("COLAB_ML_URL is not configured")
        return f"{settings.COLAB_ML_URL.rstrip('/')}{path}"

    def _headers(self) -> dict[str, str]:
        if not settings.COLAB_ML_API_KEY:
            return {}
        return {"X-ML-API-Key": settings.COLAB_ML_API_KEY}

    async def health(self) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=settings.COLAB_ML_HEALTH_TIMEOUT_SECONDS) as client:
                response = await client.get(self._url("/health"))
                response.raise_for_status()
                return response.json()
        except ColabMLUnavailable:
            raise
        except Exception as error:
            raise ColabMLUnavailable(f"Colab ML health check failed: {error}") from error

    async def remove_background(
        self,
        image_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> bytes:
        try:
            async with httpx.AsyncClient(timeout=settings.COLAB_ML_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    self._url("/ml/rembg"),
                    headers=self._headers(),
                    files={"file": (filename, image_bytes, content_type)},
                )
                response.raise_for_status()
                encoded = response.json()["clean_bytes_base64"]
                return base64.b64decode(encoded, validate=True)
        except ColabMLUnavailable:
            raise
        except Exception as error:
            raise ColabMLUnavailable(f"Remote background removal failed: {error}") from error

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
        source_language: str,
    ) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=settings.COLAB_ML_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    self._url("/ml/whisper"),
                    headers=self._headers(),
                    files={"audio": (filename, audio_bytes, content_type)},
                    data={"source_language": source_language},
                )
                response.raise_for_status()
                result = response.json()
                if not isinstance(result.get("transcript"), str) or result.get("error"):
                    raise ValueError("Invalid transcription response")
                return result
        except ColabMLUnavailable:
            raise
        except Exception as error:
            raise ColabMLUnavailable(f"Remote transcription failed: {error}") from error

    async def translate_audio(self, data: bytes, filename: str, content_type: str, language: str):
        try:
            async with httpx.AsyncClient(timeout=settings.COLAB_ML_TIMEOUT_SECONDS) as client:
                response = await client.post(self._url("/ml/translate-audio"), headers=self._headers(),
                    files={"audio": (filename, data, content_type)}, data={"source_language": language})
                response.raise_for_status()
                result = response.json()
                if not result.get("translated_text"):
                    raise ValueError("Empty translation")
                return result
        except Exception as error:
            raise ColabMLUnavailable("Colab audio translation is unavailable. Update its ML service and retry.") from error


colab_ml = ColabMLClient()
