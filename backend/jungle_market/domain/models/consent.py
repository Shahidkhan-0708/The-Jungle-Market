import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from jungle_market.domain.enums import ConsentType, DeletionRequestStatus
from jungle_market.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ConsentRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "consent_records"

    subject_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    consent_type: Mapped[ConsentType] = mapped_column(Enum(ConsentType), nullable=False)
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    retention_preference: Mapped[str | None] = mapped_column(String(64))
    revoked_reason: Mapped[str | None] = mapped_column(String(500))


class DeletionRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "deletion_requests"

    subject_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    status: Mapped[DeletionRequestStatus] = mapped_column(
        Enum(DeletionRequestStatus), default=DeletionRequestStatus.RECEIVED
    )
    reason: Mapped[str | None] = mapped_column(String(500))
    result_summary: Mapped[str | None] = mapped_column(String(1000))
