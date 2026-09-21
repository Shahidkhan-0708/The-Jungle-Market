from collections.abc import Callable, Generator
from functools import lru_cache
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from jungle_market.core.config import Settings, get_settings
from jungle_market.core.security import Principal
from jungle_market.domain.models.products import Product
from jungle_market.domain.models.users import ArtisanProfile, BuyerProfile, User
from jungle_market.infrastructure.database.session import get_db_session
from jungle_market.infrastructure.storage.local import LocalFilesystemStorage
from jungle_market.infrastructure.storage.object_storage import ObjectStorage

bearer = HTTPBearer(auto_error=False)


def settings_dependency() -> Settings:
    return get_settings()


@lru_cache(maxsize=1)
def _supabase_client(url: str, key: str) -> Any:
    from supabase import create_client

    return create_client(url, key)


def get_current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    settings: Settings = Depends(settings_dependency),
) -> Principal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise HTTPException(status_code=503, detail="Supabase authentication is not configured")
    try:
        response = _supabase_client(
            settings.supabase_url, settings.supabase_publishable_key
        ).auth.get_user(credentials.credentials)
        user = response.user
        if user is None:
            raise ValueError("token has no user")
        user_id = UUID(str(user.id))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    app_metadata = user.app_metadata or {}
    user_metadata = user.user_metadata or {}
    trusted_role = str(app_metadata.get("account_role") or app_metadata.get("role") or "").upper()
    requested_role = str(user_metadata.get("account_role") or "BUYER").upper()
    if trusted_role in {"BUYER", "ARTISAN", "AMBASSADOR"}:
        role = trusted_role
    elif requested_role in {"BUYER", "ARTISAN"}:
        role = requested_role
    else:
        role = "BUYER"
    return Principal(
        user_id=user_id,
        roles={role},
        email=getattr(user, "email", None),
        full_name=str(user_metadata.get("full_name") or user_metadata.get("name") or "") or None,
    )


def require_roles(*allowed: str) -> Callable[..., Principal]:
    allowed_roles = {role.upper() for role in allowed}

    def dependency(principal: Principal = Depends(get_current_principal)) -> Principal:
        if principal.roles.isdisjoint(allowed_roles):
            raise HTTPException(status_code=403, detail="Insufficient role")
        return principal

    return dependency


def ensure_user(session: Session, principal: Principal) -> User:
    user = session.get(User, principal.user_id)
    if user is None:
        user = User(
            id=principal.user_id,
            email=principal.email or f"{principal.user_id}@supabase.local",
            full_name=principal.full_name,
        )
        session.add(user)
        session.flush()
    return user


def ensure_artisan_profile(session: Session, principal: Principal) -> ArtisanProfile:
    ensure_user(session, principal)
    profile = session.scalar(
        select(ArtisanProfile).where(ArtisanProfile.user_id == principal.user_id)
    )
    if profile is None:
        profile = ArtisanProfile(
            user_id=principal.user_id,
            display_name=principal.full_name or principal.email or "Artisan",
        )
        session.add(profile)
        session.flush()
    return profile


def ensure_buyer_profile(session: Session, principal: Principal) -> BuyerProfile:
    ensure_user(session, principal)
    profile = session.scalar(select(BuyerProfile).where(BuyerProfile.user_id == principal.user_id))
    if profile is None:
        profile = BuyerProfile(user_id=principal.user_id)
        session.add(profile)
        session.flush()
    return profile


def owned_product(session: Session, product_id: UUID, principal: Principal) -> Product:
    product = session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="product not found")
    owner_id = session.scalar(
        select(ArtisanProfile.user_id).where(ArtisanProfile.id == product.artisan_id)
    )
    if owner_id != principal.user_id and "AMBASSADOR" not in principal.roles:
        raise HTTPException(status_code=403, detail="Product belongs to another artisan")
    return product


def storage_dependency(request: Request) -> ObjectStorage:
    storage = getattr(request.app.state, "storage", None)
    if storage is None:
        settings = get_settings()
        storage = LocalFilesystemStorage(settings.local_storage_root)
        request.app.state.storage = storage
    return storage


def get_db() -> Generator[Session, None, None]:
    yield from get_db_session()
