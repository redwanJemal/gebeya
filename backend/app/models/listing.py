"""Listing model for marketplace."""

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    BigInteger, Boolean, DateTime, Enum, Float, ForeignKey, 
    Integer, String, Text, func
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ListingStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    sold = "sold"
    expired = "expired"
    deleted = "deleted"


class ListingCondition(str, enum.Enum):
    new = "new"
    like_new = "like_new"
    used = "used"
    for_parts = "for_parts"


class Listing(Base):
    """Marketplace listing."""

    __tablename__ = "listings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # Seller
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False, index=True
    )
    
    # Category
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), 
        nullable=False, index=True
    )
    
    # Content
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="ETB")
    is_negotiable: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Condition
    condition: Mapped[ListingCondition] = mapped_column(
        Enum(ListingCondition), default=ListingCondition.used
    )
    
    # Images (URLs)
    images: Mapped[list] = mapped_column(ARRAY(String), default=list)
    
    # Location
    city: Mapped[str] = mapped_column(String(100), default="Addis Ababa")
    area: Mapped[str | None] = mapped_column(String(100))  # Sub-city/neighborhood
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    
    # Status
    status: Mapped[ListingStatus] = mapped_column(
        Enum(ListingStatus), default=ListingStatus.active, index=True
    )
    
    # Stats
    views_count: Mapped[int] = mapped_column(Integer, default=0)
    favorites_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Promotion
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    featured_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    
    # Metadata
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sold_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="listings")
    category = relationship("Category", back_populates="listings")
    favorites = relationship("Favorite", back_populates="listing", cascade="all, delete-orphan")
    chats = relationship("Chat", back_populates="listing", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Listing {self.title[:30]}>"
