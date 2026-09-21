from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from apps.api.dependencies import ensure_user, get_current_principal, get_db
from jungle_market.core.security import Principal

router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.get("/me")
def current_user(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    ensure_user(db, principal)
    db.commit()
    return {
        "id": principal.user_id,
        "email": principal.email or "",
        "full_name": principal.full_name or "",
        "role": next(iter(principal.roles)),
    }
