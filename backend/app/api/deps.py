"""API dependencies for authentication and database access."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import validate_telegram_init_data, verify_token
from app.models.user import User


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    x_init_data: Annotated[str | None, Header(alias="X-Init-Data")] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user.
    
    Supports two auth methods:
    1. X-Init-Data header (Telegram initData) - for initial auth
    2. Authorization header (JWT Bearer token) - for subsequent requests
    """
    user_data = None
    telegram_id = None

    # Try JWT token first
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = verify_token(token)
        if payload and "telegram_id" in payload:
            telegram_id = payload["telegram_id"]

    # Try Telegram initData
    elif x_init_data:
        init_data = validate_telegram_init_data(x_init_data)
        if init_data and "user" in init_data:
            user_data = init_data["user"]
            telegram_id = user_data.get("id")

    if not telegram_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication",
        )

    # Get or create user
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        # Create new user
        user = User(
            telegram_id=telegram_id,
            username=user_data.get("username"),
            first_name=user_data.get("first_name", "User"),
            last_name=user_data.get("last_name"),
            language_code=user_data.get("language_code"),
            photo_url=user_data.get("photo_url"),
            is_premium=user_data.get("is_premium", False),
        )
        db.add(user)
        await db.flush()
    elif user_data:
        # Update existing user with latest Telegram data
        user.update_from_telegram(user_data)

    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is banned",
        )

    return user


async def get_current_user_optional(
    authorization: Annotated[str | None, Header()] = None,
    x_init_data: Annotated[str | None, Header(alias="X-Init-Data")] = None,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Get current user if authenticated, or None if not."""
    try:
        return await get_current_user(authorization, x_init_data, db)
    except HTTPException:
        return None


# Type aliases for dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_current_user_optional)]
