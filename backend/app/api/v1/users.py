"""User endpoints."""

import hashlib
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser
from app.core.config import settings
from app.models.user import User


def hash_passcode(passcode: str, salt: str) -> str:
    """Hash a passcode with salt."""
    return hashlib.sha256(f"{passcode}:{salt}".encode()).hexdigest()

router = APIRouter()


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
    phone: str | None
    is_phone_verified: bool
    city: str
    area: str | None
    rating: float
    total_sales: int
    total_listings: int
    is_verified_seller: bool
    is_admin: bool = False
    has_passcode: bool = False
    settings: dict = {}

    class Config:
        from_attributes = True


def user_to_response(user: User) -> UserResponse:
    """Convert User model to UserResponse."""
    return UserResponse(
        id=str(user.id),
        telegram_id=user.telegram_id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        photo_url=user.photo_url,
        is_premium=user.is_premium,
        language_code=user.language_code,
        phone=user.phone,
        is_phone_verified=user.is_phone_verified,
        city=user.city,
        area=user.area,
        rating=user.rating,
        total_sales=user.total_sales,
        total_listings=user.total_listings,
        is_verified_seller=user.is_verified_seller,
        is_admin=user.telegram_id in settings.admin_ids,
        has_passcode=user.passcode_hash is not None,
        settings=user.settings or {},
    )


class UpdateSettingsRequest(BaseModel):
    """Request to update user settings."""
    settings: dict


class UpdateProfileRequest(BaseModel):
    """Request to update user profile."""
    city: str | None = None
    area: str | None = None


class VerifyPhoneRequest(BaseModel):
    """Request to verify phone from Telegram contact share."""
    phone_number: str


@router.get("/me", response_model=UserResponse)
async def get_me(user: CurrentUser):
    """Get current user profile."""
    return user_to_response(user)


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    user: CurrentUser,
):
    """Update current user profile."""
    if body.city:
        user.city = body.city
    if body.area:
        user.area = body.area

    return user_to_response(user)


@router.post("/me/verify-phone", response_model=UserResponse)
async def verify_phone(
    body: VerifyPhoneRequest,
    user: CurrentUser,
):
    """Verify user's phone number from Telegram contact share."""
    # Clean phone number
    phone = body.phone_number.strip().replace(" ", "").replace("-", "")
    
    # Ensure it starts with + or country code
    if not phone.startswith("+"):
        if phone.startswith("0"):
            phone = "+251" + phone[1:]  # Ethiopia
        elif phone.startswith("251"):
            phone = "+" + phone
        else:
            phone = "+251" + phone
    
    # Update user
    user.phone = phone
    user.is_phone_verified = True
    user.phone_verified_at = datetime.now(UTC)
    
    return user_to_response(user)


@router.patch("/me/settings", response_model=UserResponse)
async def update_settings(
    body: UpdateSettingsRequest,
    user: CurrentUser,
):
    """Update current user settings."""
    # Merge settings
    current_settings = user.settings or {}
    current_settings.update(body.settings)
    user.settings = current_settings

    return user_to_response(user)


# --- Passcode endpoints ---

class SetPasscodeRequest(BaseModel):
    """Request to set/update passcode."""
    passcode: str = Field(..., min_length=4, max_length=6, pattern=r"^\d+$")


class VerifyPasscodeRequest(BaseModel):
    """Request to verify passcode."""
    passcode: str = Field(..., min_length=4, max_length=6, pattern=r"^\d+$")


class PasscodeResponse(BaseModel):
    """Passcode operation response."""
    success: bool
    message: str


@router.post("/me/passcode", response_model=PasscodeResponse)
async def set_passcode(
    body: SetPasscodeRequest,
    user: CurrentUser,
):
    """Set or update passcode for app lock."""
    # Hash passcode with user's telegram_id as salt
    salt = str(user.telegram_id)
    user.passcode_hash = hash_passcode(body.passcode, salt)
    
    return PasscodeResponse(
        success=True,
        message="Passcode set successfully"
    )


@router.post("/me/passcode/verify", response_model=PasscodeResponse)
async def verify_passcode(
    body: VerifyPasscodeRequest,
    user: CurrentUser,
):
    """Verify passcode."""
    if not user.passcode_hash:
        raise HTTPException(status_code=400, detail="No passcode set")
    
    salt = str(user.telegram_id)
    if hash_passcode(body.passcode, salt) != user.passcode_hash:
        raise HTTPException(status_code=401, detail="Invalid passcode")
    
    return PasscodeResponse(
        success=True,
        message="Passcode verified"
    )


@router.delete("/me/passcode", response_model=PasscodeResponse)
async def remove_passcode(
    body: VerifyPasscodeRequest,
    user: CurrentUser,
):
    """Remove passcode (requires current passcode)."""
    if not user.passcode_hash:
        raise HTTPException(status_code=400, detail="No passcode set")
    
    # Verify current passcode first
    salt = str(user.telegram_id)
    if hash_passcode(body.passcode, salt) != user.passcode_hash:
        raise HTTPException(status_code=401, detail="Invalid passcode")
    
    user.passcode_hash = None
    
    return PasscodeResponse(
        success=True,
        message="Passcode removed"
    )
