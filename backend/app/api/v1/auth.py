"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, validate_telegram_init_data
from app.models.user import User

router = APIRouter()


class AuthRequest(BaseModel):
    """Request body for authentication."""
    init_data: str


class AuthResponse(BaseModel):
    """Response with JWT token and user info."""
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    """User data response."""
    id: str
    telegram_id: int
    username: str | None
    first_name: str
    last_name: str | None
    photo_url: str | None
    is_premium: bool
    language_code: str | None

    class Config:
        from_attributes = True


@router.post("/telegram", response_model=AuthResponse)
async def auth_telegram(
    body: AuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate via Telegram initData.
    
    Validates the initData from Telegram Mini App and returns a JWT token.
    Creates user if doesn't exist, updates if exists.
    """
    # Validate initData
    init_data = validate_telegram_init_data(body.init_data)
    if not init_data or "user" not in init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram initData",
        )

    tg_user = init_data["user"]
    telegram_id = tg_user.get("id")

    if not telegram_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user ID in initData",
        )

    # Get or create user
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            telegram_id=telegram_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name", "User"),
            last_name=tg_user.get("last_name"),
            language_code=tg_user.get("language_code"),
            photo_url=tg_user.get("photo_url"),
            is_premium=tg_user.get("is_premium", False),
        )
        db.add(user)
        await db.flush()
    else:
        user.update_from_telegram(tg_user)

    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is banned",
        )

    # Create JWT token
    token = create_access_token(
        data={"sub": str(user.id), "telegram_id": user.telegram_id}
    )

    return AuthResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "telegram_id": user.telegram_id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo_url": user.photo_url,
            "is_premium": user.is_premium,
            "language_code": user.language_code,
            "phone": user.phone,
            "is_phone_verified": user.is_phone_verified,
            "city": user.city,
            "area": user.area,
            "rating": user.rating,
            "total_sales": user.total_sales,
            "total_listings": user.total_listings,
            "is_verified_seller": user.is_verified,
            "is_admin": user.is_admin,
            "settings": user.settings or {},
        },
    )
