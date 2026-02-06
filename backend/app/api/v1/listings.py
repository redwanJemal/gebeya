"""Listing endpoints."""

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.models.listing import Listing, ListingCondition, ListingStatus
from app.models.user import User
from app.models.favorite import Favorite

router = APIRouter()


# --- Schemas ---

class ListingCreate(BaseModel):
    """Create listing request."""
    title: str = Field(..., min_length=3, max_length=200)
    description: str | None = None
    price: float = Field(..., gt=0)
    category_id: str
    condition: ListingCondition = ListingCondition.USED
    is_negotiable: bool = True
    city: str = "Addis Ababa"
    area: str | None = None
    images: list[str] = []


class ListingUpdate(BaseModel):
    """Update listing request."""
    title: str | None = None
    description: str | None = None
    price: float | None = None
    condition: ListingCondition | None = None
    is_negotiable: bool | None = None
    status: ListingStatus | None = None
    area: str | None = None
    images: list[str] | None = None


class SellerInfo(BaseModel):
    """Seller info in listing."""
    id: str
    name: str
    username: str | None
    is_verified: bool
    rating: float
    total_sales: int
    member_since: str


class ListingResponse(BaseModel):
    """Listing response."""
    id: str
    title: str
    description: str | None
    price: float
    currency: str
    is_negotiable: bool
    condition: str
    images: list[str]
    city: str
    area: str | None
    status: str
    views_count: int
    favorites_count: int
    is_featured: bool
    created_at: str
    category_id: str
    category_name: str | None = None
    seller: SellerInfo | None = None
    is_favorited: bool = False


class ListingListResponse(BaseModel):
    """Paginated listing list."""
    items: list[ListingResponse]
    total: int
    page: int
    per_page: int
    has_more: bool


# --- Endpoints ---

@router.get("", response_model=ListingListResponse)
async def list_listings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    category: str | None = None,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    condition: ListingCondition | None = None,
    city: str = "Addis Ababa",
    db: AsyncSession = Depends(get_db),
):
    """List active listings with filters."""
    query = select(Listing).where(
        Listing.status == "active",
        Listing.city == city,
    ).options(selectinload(Listing.user))
    
    # Filters
    if category:
        query = query.where(Listing.category_id == category)
    if search:
        query = query.where(Listing.title.ilike(f"%{search}%"))
    if min_price:
        query = query.where(Listing.price >= min_price)
    if max_price:
        query = query.where(Listing.price <= max_price)
    if condition:
        query = query.where(Listing.condition == condition)
    
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    # Paginate
    offset = (page - 1) * per_page
    query = query.order_by(
        Listing.is_featured.desc(),
        Listing.created_at.desc()
    ).offset(offset).limit(per_page)
    
    result = await db.execute(query)
    listings = result.scalars().all()
    
    items = [
        ListingResponse(
            id=str(l.id),
            title=l.title,
            description=l.description,
            price=l.price,
            currency=l.currency,
            is_negotiable=l.is_negotiable,
            condition=l.condition.value,
            images=l.images or [],
            city=l.city,
            area=l.area,
            status=l.status.value,
            views_count=l.views_count,
            favorites_count=l.favorites_count,
            is_featured=l.is_featured,
            created_at=l.created_at.isoformat(),
            category_id=str(l.category_id),
            seller=SellerInfo(
                id=str(l.user.id),
                name=l.user.display_name,
                username=l.user.username,
                is_verified=l.user.is_verified,
                rating=l.user.rating,
                total_sales=l.user.total_sales,
                member_since=l.user.created_at.strftime("%b %Y"),
            ) if l.user else None,
        )
        for l in listings
    ]
    
    return ListingListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(items)) < total,
    )


@router.post("", response_model=ListingResponse, status_code=201)
async def create_listing(
    body: ListingCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new listing. User must be phone verified."""
    if not user.is_phone_verified:
        raise HTTPException(
            status_code=403,
            detail="ስልክ ቁጥርዎን ያረጋግጡ / Please verify your phone number to post listings"
        )
    
    listing = Listing(
        user_id=user.id,
        category_id=UUID(body.category_id),
        title=body.title,
        description=body.description,
        price=body.price,
        condition=body.condition,
        is_negotiable=body.is_negotiable,
        city=body.city,
        area=body.area,
        images=body.images,
        status=ListingStatus.ACTIVE,
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )
    db.add(listing)
    
    # Update user stats
    user.total_listings += 1
    
    await db.flush()
    await db.refresh(listing)
    
    return ListingResponse(
        id=str(listing.id),
        title=listing.title,
        description=listing.description,
        price=listing.price,
        currency=listing.currency,
        is_negotiable=listing.is_negotiable,
        condition=listing.condition.value,
        images=listing.images or [],
        city=listing.city,
        area=listing.area,
        status=listing.status.value,
        views_count=listing.views_count,
        favorites_count=listing.favorites_count,
        is_featured=listing.is_featured,
        created_at=listing.created_at.isoformat(),
        category_id=str(listing.category_id),
        seller=SellerInfo(
            id=str(user.id),
            name=user.display_name,
            username=user.username,
            is_verified=user.is_verified,
            rating=user.rating,
            total_sales=user.total_sales,
            member_since=user.created_at.strftime("%b %Y"),
        ),
    )


@router.get("/my", response_model=list[ListingResponse])
async def my_listings(
    user: CurrentUser,
    status: ListingStatus | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get current user's listings."""
    query = select(Listing).where(Listing.user_id == user.id)
    
    if status:
        query = query.where(Listing.status == status)
    else:
        query = query.where(Listing.status != ListingStatus.DELETED)
    
    query = query.order_by(Listing.created_at.desc())
    
    result = await db.execute(query)
    listings = result.scalars().all()
    
    return [
        ListingResponse(
            id=str(l.id),
            title=l.title,
            description=l.description,
            price=l.price,
            currency=l.currency,
            is_negotiable=l.is_negotiable,
            condition=l.condition.value,
            images=l.images or [],
            city=l.city,
            area=l.area,
            status=l.status.value,
            views_count=l.views_count,
            favorites_count=l.favorites_count,
            is_featured=l.is_featured,
            created_at=l.created_at.isoformat(),
            category_id=str(l.category_id),
        )
        for l in listings
    ]


@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get listing by ID."""
    result = await db.execute(
        select(Listing)
        .where(Listing.id == listing_id)
        .options(selectinload(Listing.user))
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Increment views
    listing.views_count += 1
    
    return ListingResponse(
        id=str(listing.id),
        title=listing.title,
        description=listing.description,
        price=listing.price,
        currency=listing.currency,
        is_negotiable=listing.is_negotiable,
        condition=listing.condition.value,
        images=listing.images or [],
        city=listing.city,
        area=listing.area,
        status=listing.status.value,
        views_count=listing.views_count,
        favorites_count=listing.favorites_count,
        is_featured=listing.is_featured,
        created_at=listing.created_at.isoformat(),
        category_id=str(listing.category_id),
        seller=SellerInfo(
            id=str(listing.user.id),
            name=listing.user.display_name,
            username=listing.user.username,
            is_verified=listing.user.is_verified,
            rating=listing.user.rating,
            total_sales=listing.user.total_sales,
            member_since=listing.user.created_at.strftime("%b %Y"),
        ) if listing.user else None,
    )


@router.patch("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: UUID,
    body: ListingUpdate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update a listing (owner only)."""
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your listing")
    
    # Update fields
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)
    
    # Handle sold status
    if body.status == ListingStatus.SOLD:
        listing.sold_at = datetime.now(UTC)
        user.total_sales += 1
    
    return ListingResponse(
        id=str(listing.id),
        title=listing.title,
        description=listing.description,
        price=listing.price,
        currency=listing.currency,
        is_negotiable=listing.is_negotiable,
        condition=listing.condition.value,
        images=listing.images or [],
        city=listing.city,
        area=listing.area,
        status=listing.status.value,
        views_count=listing.views_count,
        favorites_count=listing.favorites_count,
        is_featured=listing.is_featured,
        created_at=listing.created_at.isoformat(),
        category_id=str(listing.category_id),
    )


@router.delete("/{listing_id}")
async def delete_listing(
    listing_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Delete a listing (soft delete)."""
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your listing")
    
    listing.status = ListingStatus.DELETED
    
    return {"message": "Listing deleted"}


@router.post("/{listing_id}/favorite")
async def toggle_favorite(
    listing_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Toggle favorite on a listing."""
    # Check listing exists
    listing = await db.get(Listing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Check if already favorited
    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.listing_id == listing_id,
        )
    )
    favorite = result.scalar_one_or_none()
    
    if favorite:
        # Remove favorite
        await db.delete(favorite)
        listing.favorites_count = max(0, listing.favorites_count - 1)
        return {"favorited": False}
    else:
        # Add favorite
        favorite = Favorite(user_id=user.id, listing_id=listing_id)
        db.add(favorite)
        listing.favorites_count += 1
        return {"favorited": True}
