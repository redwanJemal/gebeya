"""API v1 router."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.categories import router as categories_router
from app.api.v1.listings import router as listings_router
from app.api.v1.demo import router as demo_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(users_router, prefix="/users", tags=["users"])
router.include_router(categories_router, prefix="/categories", tags=["categories"])
router.include_router(listings_router, prefix="/listings", tags=["listings"])
router.include_router(demo_router, prefix="/demo", tags=["demo"])
