from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Enum as SQLEnum
from typing import Optional
from uuid import UUID, uuid4

from jungle_market.infrastructure.database.models.base import Base, TimestampMixin
from jungle_market.domain.enums.auth import RoleEnum

class User(Base, TimestampMixin):
    """Optional application profile mirror; credentials live in Supabase Auth."""

    __tablename__ = "users"
    
    # Use the matching Supabase auth.users UUID when a local profile is created.
    id: Mapped[UUID] = mapped_column(primary_key=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    role: Mapped[RoleEnum] = mapped_column(SQLEnum(RoleEnum))
    is_active: Mapped[bool] = mapped_column(default=True)

class ArtisanProfile(Base, TimestampMixin):
    __tablename__ = "artisan_profiles"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    region: Mapped[Optional[str]] = mapped_column(String(255))
    bio: Mapped[Optional[str]] = mapped_column(String)
