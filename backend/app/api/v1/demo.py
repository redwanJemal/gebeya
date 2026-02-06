"""Demo data endpoints."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.config import settings
from app.core.database import get_db
from app.models.listing import Listing

router = APIRouter()


@router.post("/auto-seed")
async def auto_seed_if_empty(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Auto-seed demo listings if marketplace is empty. Admin only."""
    # Only admins can trigger
    if user.telegram_id not in settings.admin_ids:
        return {"seeded": False, "reason": "not_admin"}
    
    # Check if any listings exist
    count_result = await db.execute(select(func.count()).select_from(Listing))
    count = count_result.scalar() or 0
    
    if count > 0:
        return {"seeded": False, "reason": "listings_exist", "count": count}
    
    # Seed demo listings
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
            status="active",
            expires_at=datetime.now(UTC) + timedelta(days=30),
        )
        db.add(listing)
        created.append(item["title"])

    user.total_listings += len(created)
    await db.commit()

    return {"seeded": True, "count": len(created), "listings": created}

# Sample demo listings
DEMO_LISTINGS = [
    {
        "title": "iPhone 14 Pro Max - አዲስ",
        "description": "Brand new iPhone 14 Pro Max, 256GB, Deep Purple. ከሳጥን ያልወጣ፣ ዋስትና አለው።",
        "price": 85000,
        "condition": "new",
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
        "condition": "used",
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
        "condition": "like_new",
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
        "condition": "used",
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
        "condition": "like_new",
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
        "condition": "new",
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
        "condition": "used",
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
        "condition": "used",
        "category_slug": "kids-baby",
        "images": [
            "https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400",
        ],
        "area": "Gerji",
    },
    # Additional demo listings for scroll testing
    {
        "title": "iPad Pro 12.9\" M2",
        "description": "iPad Pro with Magic Keyboard and Apple Pencil 2. Perfect for drawing and productivity.",
        "price": 75000,
        "condition": "like_new",
        "category_slug": "electronics",
        "images": [
            "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400",
        ],
        "area": "Bole",
    },
    {
        "title": "Sony WH-1000XM5 Headphones",
        "description": "Best noise cancelling headphones. በጣም ጥሩ ድምፅ! ከሳጥን ያልወጣ።",
        "price": 12000,
        "condition": "new",
        "category_slug": "electronics",
        "images": [
            "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400",
        ],
        "area": "Kazanchis",
    },
    {
        "title": "Honda Fit 2019 - Hybrid",
        "description": "Honda Fit Hybrid, excellent fuel economy. 35,000 km. First owner.",
        "price": 1450000,
        "condition": "used",
        "category_slug": "vehicles",
        "images": [
            "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400",
        ],
        "area": "Ayat",
    },
    {
        "title": "Dining Table - 6 Seater",
        "description": "Wooden dining table with 6 chairs. Modern design. ከእንጨት የተሰራ።",
        "price": 28000,
        "condition": "used",
        "category_slug": "home-garden",
        "images": [
            "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400",
        ],
        "area": "Summit",
    },
    {
        "title": "Men's Leather Jacket - Size L",
        "description": "Genuine leather jacket, black. Imported from Turkey. Size L.",
        "price": 5500,
        "condition": "new",
        "category_slug": "fashion",
        "images": [
            "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400",
        ],
        "area": "Merkato",
    },
    {
        "title": "Xbox Series X + Game Pass",
        "description": "Xbox Series X with 3 months Game Pass Ultimate. Perfect condition.",
        "price": 38000,
        "condition": "like_new",
        "category_slug": "gaming",
        "images": [
            "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400",
        ],
        "area": "Jemo",
    },
    {
        "title": "Baby Crib + Mattress",
        "description": "Wooden baby crib with mattress. Barely used. Perfect for newborns.",
        "price": 6500,
        "condition": "like_new",
        "category_slug": "kids-baby",
        "images": [
            "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400",
        ],
        "area": "Kotebe",
    },
    {
        "title": "Electric Guitar - Fender",
        "description": "Fender Stratocaster electric guitar with amp. Great for beginners.",
        "price": 15000,
        "condition": "used",
        "category_slug": "electronics",
        "images": [
            "https://images.unsplash.com/photo-1550291652-6ea9114a47b1?w=400",
        ],
        "area": "4 Kilo",
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
    from app.core.config import settings
    
    # Only admins can seed
    if user.telegram_id not in settings.admin_ids:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin only")
    
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
            status="active",
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
