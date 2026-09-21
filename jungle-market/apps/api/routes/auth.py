"""Supabase-backed authentication dependencies and routes."""

from __future__ import annotations

import asyncio
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import Client, create_client

from jungle_market.core.config import settings


router = APIRouter(prefix="/v1/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)
PUBLIC_ROLES = {"BUYER", "ARTISAN", "AMBASSADOR"}
_supabase: Client | None = None


class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str


def supabase_client() -> Client:
    global _supabase
    if not settings.SUPABASE_URL or not settings.SUPABASE_PUBLISHABLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication is not configured",
        )
    if _supabase is None:
        _supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_PUBLISHABLE_KEY,
        )
    return _supabase


def user_response(user: Any) -> UserResponse:
    metadata = user.user_metadata or {}
    email = user.email or ""
    trusted = getattr(user, "app_metadata", None) or {}
    raw_role = (
        trusted.get("account_role")
        or trusted.get("role")
        or metadata.get("account_role")
        or metadata.get("role")
        or "ARTISAN"
    )
    role = str(raw_role).upper()
    if role not in PUBLIC_ROLES:
        role = "ARTISAN"
    full_name = str(metadata.get("full_name") or metadata.get("name") or (email.split("@")[0] if email else "Artisan Maker"))
    return UserResponse(id=user.id, full_name=full_name, email=email, role=role)


async def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> UserResponse:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Your Supabase session is invalid or has expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized

    try:
        response = await asyncio.to_thread(
            supabase_client().auth.get_user,
            credentials.credentials,
        )
    except HTTPException:
        raise
    except Exception:
        raise unauthorized from None
    if response.user is None:
        raise unauthorized
    return user_response(response.user)


def require_role(user: UserResponse, *roles: str) -> None:
    allowed_roles = {r.upper() for r in roles}
    if user.role.upper() not in allowed_roles and "ARTISAN" not in allowed_roles:
        raise HTTPException(403, "This action is not available for your account role.")


@router.get("/me", response_model=UserResponse)
async def me(user: Annotated[UserResponse, Depends(current_user)]) -> UserResponse:
    """Validate a Supabase access token and return its public app profile."""
    return user
