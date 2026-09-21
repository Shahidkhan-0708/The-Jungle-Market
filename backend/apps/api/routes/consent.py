from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.dependencies import ensure_user, get_current_principal, get_db
from jungle_market.core.security import Principal
from jungle_market.domain.enums import DeletionRequestStatus
from jungle_market.domain.models.consent import ConsentRecord, DeletionRequest
from jungle_market.domain.schemas.consent import (
    ConsentCreate,
    ConsentRevocation,
    DeletionRequestCreate,
)

router = APIRouter(prefix="/v1", tags=["consent"])


def _require_self(principal: Principal, subject_user_id: UUID) -> None:
    if principal.user_id != subject_user_id:
        raise HTTPException(status_code=403, detail="Cannot manage another user's data")


@router.post("/consent")
def create_consent(
    payload: ConsentCreate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    _require_self(principal, payload.subject_user_id)
    ensure_user(db, principal)
    record = ConsentRecord(
        subject_user_id=payload.subject_user_id,
        consent_type=payload.consent_type,
        granted=payload.granted,
        retention_preference=payload.retention_preference,
    )
    db.add(record)
    db.commit()
    return {"id": record.id, "granted": record.granted}


@router.post("/consent/revoke")
def revoke_consent(
    payload: ConsentRevocation,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    _require_self(principal, payload.subject_user_id)
    record = db.scalar(
        select(ConsentRecord)
        .where(
            ConsentRecord.subject_user_id == payload.subject_user_id,
            ConsentRecord.consent_type == payload.consent_type,
        )
        .order_by(ConsentRecord.created_at.desc())
    )
    if record is None:
        return {"revoked": False, "reason": "matching consent record not found"}
    record.granted = False
    record.revoked_reason = payload.reason
    db.commit()
    return {"id": record.id, "granted": record.granted}


@router.post("/data-deletion-requests")
def request_deletion(
    payload: DeletionRequestCreate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    _require_self(principal, payload.subject_user_id)
    ensure_user(db, principal)
    request = DeletionRequest(
        subject_user_id=payload.subject_user_id,
        status=DeletionRequestStatus.RECEIVED,
        reason=payload.reason,
    )
    db.add(request)
    db.commit()
    return {
        "id": request.id,
        "subject_user_id": request.subject_user_id,
        "status": request.status,
    }
