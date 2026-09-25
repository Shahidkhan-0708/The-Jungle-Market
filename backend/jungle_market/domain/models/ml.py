import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from jungle_market.domain.enums import DeploymentStage, ModelStatus
from jungle_market.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ModelVersion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "model_versions"

    model_name: Mapped[str] = mapped_column(String(128), index=True)
    version: Mapped[str] = mapped_column(String(128))
    artifact_uri: Mapped[str] = mapped_column(String(1000))
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[ModelStatus] = mapped_column(Enum(ModelStatus), default=ModelStatus.CANDIDATE)
    promoted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    previous_stable_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("model_versions.id")
    )


class ModelEvaluation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "model_evaluations"

    model_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("model_versions.id"))
    dataset_version: Mapped[str] = mapped_column(String(128))
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    passed: Mapped[bool] = mapped_column(default=False)


class DeploymentEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "deployment_events"

    model_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("model_versions.id"))
    stage: Mapped[DeploymentStage] = mapped_column(Enum(DeploymentStage), nullable=False)
    event_payload: Mapped[dict] = mapped_column(JSON, default=dict)
