from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Boolean, ForeignKey
from uuid import UUID, uuid4

from jungle_market.infrastructure.database.models.base import Base, TimestampMixin

class ConsentRecord(Base, TimestampMixin):
    __tablename__ = "consent_records"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    artisan_id: Mapped[UUID] = mapped_column(ForeignKey("artisan_profiles.id"), index=True)
    
    media_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    voice_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    retention_preference: Mapped[str] = mapped_column(String(50), default="standard")

class DeletionRequest(Base, TimestampMixin):
    __tablename__ = "deletion_requests"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
