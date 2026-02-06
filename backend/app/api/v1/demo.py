"""Demo data endpoints."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.models.listing import Listing, ListingCondition, ListingStatus

router = APIRouter()

# Sample demo listings
DEMO_LISTINGS = [
    {
        "title": "iPhone 14 Pro Max - አዲስ",
        "description": "Brand new iPhone 14 Pro Max, 256GB, Deep Purple. ከሳጥን ያልወጣ፣ ዋስትና አለው።",
        "price": 85000,
        "condition": ListingCondition.NEW,
        "category_slug": "electronics",
        "images": [
            "https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=400",
        ],
        "area": "Bole",
    },
    {
        "title": "Samsung Galaxy S23 Ultra",
        "description": "ጥቅም ላይ የዋለ፣ ጥሩ ሁኔታ ላይ ያለ። Charger እና case ጋር።",
        "price": 55000,
        "condition": ListingCondition.USED,
        "category_slug": "electronics",
        "images": [
            "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
        ],
        "area": "Kazanchis",
    },
    {
        "title": "MacBook Pro M2 - 14 inch",
        "description": "MacBook Pro 14\", M2 Pro chip, 16GB RAM, 512GB SSD. ለስራ ተስማሚ!",
        "price": 120000,
        "condition": ListingCondition.LIKE_NEW,
        "category_slug": "electronics",
        "images": [
            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400",
        ],
        "area": "CMC",
    },
    {
        "title": "Toyota Vitz 2018",
        "description": "Toyota Vitz, 2018 model, automatic, 45,000 km. Very clean, accident-free.",
        "price": 1200000,
        "condition": ListingCondition.USED,
        "category_slug": "vehicles",
        "images": [
            "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400",
        ],
        "area": "Megenagna",
    },
    {
        "title": "ሶፋ ቤድ - L-Shape",
        "description": "L-shaped sofa bed, grey fabric, converts to bed. ከአዲስ የተገዛ፣ 6 ወር ያህል የዋለ።",
        "price": 35000,
        "condition": ListingCondition.LIKE_NEW,
        "category_slug": "home-garden",
        "images": [
            "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400",
        ],
        "area": "Sarbet",
    },
    {
        "title": "Nike Air Jordan 1 - Size 42",
        "description": "Original Nike Air Jordan 1 High, size 42 (EU). ከውጭ የመጣ።",
        "price": 8500,
        "condition": ListingCondition.NEW,
        "category_slug": "fashion",
        "images": [
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
        ],
        "area": "Piassa",
    },
    {
        "title": "PlayStation 5 + 2 Controllers",
        "description": "PS5 Disc Edition with 2 controllers and 3 games (FIFA 24, Spider-Man 2, GTA V).",
        "price": 45000,
        "condition": ListingCondition.USED,
        "category_slug": "gaming",
        "images": [
            "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400",
        ],
        "area": "Mexico",
    },
    {
        "title": "Baby Stroller - Graco",
        "description": "Graco stroller, excellent condition. Foldable, includes rain cover and cup holder.",
        "price": 4500,
        "condition": ListingCondition.USED,
        "category_slug": "kids-baby",
        "images": [
            "https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400",
        ],
        "area": "Gerji",
    },
]

# Category ID mapping
CATEGORY_IDS = {
    "electronics": "a1111111-1111-1111-1111-111111111111",
    "vehicles": "a2222222-2222-2222-2222-222222222222",
    "fashion": "a3333333-3333-3333-3333-333333333333",
    "home-garden": "a4444444-4444-4444-4444-444444444444",
    "gaming": "a6666666-6666-6666-6666-666666666666",
    "kids-baby": "b1111111-1111-1111-1111-111111111111",
}


@router.post("/seed-listings")
async def seed_demo_listings(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Seed demo listings for the current user."""
    created = []

    for item in DEMO_LISTINGS:
        category_id = CATEGORY_IDS.get(item["category_slug"])
        if not category_id:
            continue

        listing = Listing(
            user_id=user.id,
            category_id=uuid.UUID(category_id),
            title=item["title"],
            description=item["description"],
            price=item["price"],
            condition=item["condition"],
            is_negotiable=True,
            city="Addis Ababa",
            area=item.get("area"),
            images=item.get("images", []),
            status=ListingStatus.ACTIVE,
            expires_at=datetime.now(UTC) + timedelta(days=30),
        )
        db.add(listing)
        created.append(item["title"])

    # Update user stats
    user.total_listings += len(created)

    await db.commit()

    return {
        "message": f"Created {len(created)} demo listings",
        "listings": created,
    }
