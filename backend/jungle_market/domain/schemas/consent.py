from uuid import UUID

from pydantic import BaseModel

from jungle_market.domain.enums import ConsentType


class ConsentCreate(BaseModel):
    subject_user_id: UUID
    consent_type: ConsentType
    granted: bool
    retention_preference: str | None = None


class ConsentRevocation(BaseModel):
    subject_user_id: UUID
    consent_type: ConsentType
    reason: str | None = None


class DeletionRequestCreate(BaseModel):
    subject_user_id: UUID
    reason: str | None = None
