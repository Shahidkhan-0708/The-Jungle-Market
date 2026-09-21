from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from jungle_market.domain.enums import EvidenceSource, VerificationState


def utc_now() -> datetime:
    return datetime.now(UTC)


class APIError(BaseModel):
    code: str
    message: str


class EvidenceField(BaseModel):
    value: Any
    source: EvidenceSource
    confidence: float | None = Field(default=None, ge=0, le=1)
    model_version: str | None = None
    timestamp: datetime = Field(default_factory=utc_now)
    verification_state: VerificationState = VerificationState.UNVERIFIED


class TextEvidenceField(BaseModel):
    value: str | None
    source: EvidenceSource
    confidence: float | None = Field(default=None, ge=0, le=1)
    model_version: str | None = None
    timestamp: datetime = Field(default_factory=utc_now)
    verification_state: VerificationState = VerificationState.UNVERIFIED


class IDResponse(BaseModel):
    id: UUID


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Money(BaseModel):
    amount: float = Field(ge=0)
    currency: str = Field(min_length=3, max_length=3)

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str) -> str:
        return value.upper()
