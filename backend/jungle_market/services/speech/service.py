from pathlib import Path
from typing import Any

from jungle_market.core.config import Settings
from jungle_market.core.errors import TranscriptLowConfidence
from jungle_market.domain.schemas.speech import TranscriptResult, TranscriptSegment


class FasterWhisperTranscriber:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.model_version = (
            f"faster-whisper-{settings.whisper_model_size}-{settings.whisper_compute_type}"
        )
        self._model = None

    def _load_model(self) -> Any:
        if self._model is None:
            from faster_whisper import WhisperModel

            self._model = WhisperModel(
                self.settings.whisper_model_size,
                device=self.settings.whisper_device,
                compute_type=self.settings.whisper_compute_type,
            )
        return self._model

    def transcribe(self, audio_path: Path, vad_filter: bool = True) -> TranscriptResult:
        model = self._load_model()
        segments_iter, info = model.transcribe(str(audio_path), vad_filter=vad_filter)
        segments: list[TranscriptSegment] = []
        confidences: list[float] = []
        for segment in segments_iter:
            confidence = None
            if getattr(segment, "avg_logprob", None) is not None:
                confidence = max(0.0, min(1.0, 1.0 + float(segment.avg_logprob)))
                confidences.append(confidence)
            segments.append(
                TranscriptSegment(
                    start=float(segment.start),
                    end=float(segment.end),
                    text=segment.text.strip(),
                    confidence=confidence,
                )
            )
        transcript = " ".join(segment.text for segment in segments).strip()
        confidence = sum(confidences) / len(confidences) if confidences else 0.5
        result = TranscriptResult(
            transcript=transcript,
            segments=segments,
            detected_language=getattr(info, "language", None),
            confidence=confidence,
            model_version=self.model_version,
        )
        TranscriptQualityGate(self.settings.whisper_min_transcript_confidence).assert_acceptable(
            result
        )
        return result


class TranscriptQualityGate:
    def __init__(self, min_confidence: float) -> None:
        self.min_confidence = min_confidence

    def assert_acceptable(self, result: TranscriptResult) -> None:
        if not result.transcript.strip():
            raise TranscriptLowConfidence("empty transcript")
        if result.confidence < self.min_confidence:
            raise TranscriptLowConfidence("transcript below production confidence gate")
