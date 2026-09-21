from pydantic import BaseModel, Field


class TranscriptSegment(BaseModel):
    start: float = Field(ge=0)
    end: float = Field(ge=0)
    text: str
    confidence: float | None = Field(default=None, ge=0, le=1)


class TranscriptResult(BaseModel):
    transcript: str
    segments: list[TranscriptSegment]
    detected_language: str | None = None
    confidence: float = Field(ge=0, le=1)
    model_version: str
