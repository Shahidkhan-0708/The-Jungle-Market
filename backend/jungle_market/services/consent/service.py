from dataclasses import dataclass
from uuid import UUID, uuid4

from jungle_market.domain.enums import ConsentType, DeletionRequestStatus


@dataclass
class ConsentState:
    id: UUID
    subject_user_id: UUID
    consent_type: ConsentType
    granted: bool
    retention_preference: str | None = None


class ConsentService:
    def require_granted(
        self, records: list[ConsentState], subject_user_id: UUID, consent_type: ConsentType
    ) -> ConsentState:
        for record in records:
            if (
                record.subject_user_id == subject_user_id
                and record.consent_type == consent_type
                and record.granted
            ):
                return record
        from jungle_market.core.errors import ConsentRequired

        raise ConsentRequired(f"{consent_type.value} consent is required")

    def revoke(self, record: ConsentState) -> ConsentState:
        record.granted = False
        return record


@dataclass
class DeletionWorkflowResult:
    request_id: UUID
    status: DeletionRequestStatus
    deleted_media_uris: list[str]
    anonymized_records: list[str]
    legal_hold_records: list[str]


class DeletionWorkflow:
    def process(
        self,
        media_uris: list[str],
        has_commerce_records: bool,
    ) -> DeletionWorkflowResult:
        legal_hold = ["orders", "payments", "payouts"] if has_commerce_records else []
        status = (
            DeletionRequestStatus.PARTIAL_LEGAL_HOLD
            if legal_hold
            else DeletionRequestStatus.COMPLETED
        )
        return DeletionWorkflowResult(
            request_id=uuid4(),
            status=status,
            deleted_media_uris=media_uris,
            anonymized_records=["product_media", "transcripts"],
            legal_hold_records=legal_hold,
        )
