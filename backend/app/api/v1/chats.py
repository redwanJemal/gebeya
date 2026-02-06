"""Chat endpoints."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.models.chat import Chat, Message
from app.models.listing import Listing
from app.models.user import User

router = APIRouter()


# --- Schemas ---

class UnreadCountResponse(BaseModel):
    count: int

class MessageCreate(BaseModel):
    text: str


class MessageResponse(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    sender_name: str
    text: str | None
    image_url: str | None
    is_read: bool
    created_at: str
    is_mine: bool = False


class ChatListItem(BaseModel):
    id: str
    listing_id: str
    listing_title: str
    listing_image: str | None
    listing_price: float
    other_user_id: str
    other_user_name: str
    other_user_verified: bool
    last_message: str | None
    last_message_at: str | None
    unread_count: int
    is_seller: bool


class ChatDetail(BaseModel):
    id: str
    listing_id: str
    listing_title: str
    listing_image: str | None
    listing_price: float
    listing_status: str
    other_user_id: str
    other_user_name: str
    other_user_verified: bool
    is_seller: bool
    messages: list[MessageResponse]


# --- Endpoints ---

@router.get("", response_model=list[ChatListItem])
async def list_chats(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """List all chats for current user."""
    query = select(Chat).where(
        or_(Chat.buyer_id == user.id, Chat.seller_id == user.id),
        Chat.is_active == True,
    ).options(
        selectinload(Chat.listing),
        selectinload(Chat.buyer),
        selectinload(Chat.seller),
        selectinload(Chat.messages),
    ).order_by(Chat.last_message_at.desc().nullslast())
    
    result = await db.execute(query)
    chats = result.scalars().all()
    
    items = []
    for chat in chats:
        is_seller = chat.seller_id == user.id
        other_user = chat.buyer if is_seller else chat.seller
        
        # Get unread count
        unread_count = len([m for m in chat.messages if not m.is_read and m.sender_id != user.id])
        
        # Get last message
        last_msg = max(chat.messages, key=lambda m: m.created_at) if chat.messages else None
        
        items.append(ChatListItem(
            id=str(chat.id),
            listing_id=str(chat.listing_id),
            listing_title=chat.listing.title if chat.listing else "Deleted",
            listing_image=chat.listing.images[0] if chat.listing and chat.listing.images else None,
            listing_price=chat.listing.price if chat.listing else 0,
            other_user_id=str(other_user.id) if other_user else "",
            other_user_name=other_user.display_name if other_user else "User",
            other_user_verified=other_user.is_phone_verified if other_user else False,
            last_message=last_msg.text if last_msg else None,
            last_message_at=last_msg.created_at.isoformat() if last_msg else None,
            unread_count=unread_count,
            is_seller=is_seller,
        ))
    
    return items


@router.post("", response_model=ChatDetail)
async def create_or_get_chat(
    listing_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat for a listing or return existing one."""
    # Get listing
    listing = await db.get(Listing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Can't chat with yourself
    if listing.user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot chat on your own listing")
    
    # Check for existing chat
    existing = await db.execute(
        select(Chat).where(
            Chat.listing_id == listing_id,
            Chat.buyer_id == user.id,
        )
    )
    chat = existing.scalar_one_or_none()
    
    if not chat:
        # Create new chat
        chat = Chat(
            listing_id=listing_id,
            buyer_id=user.id,
            seller_id=listing.user_id,
        )
        db.add(chat)
        await db.flush()
        await db.refresh(chat)
    
    # Load relationships
    await db.refresh(chat, ["listing", "buyer", "seller", "messages"])
    
    seller = await db.get(User, listing.user_id)
    
    return ChatDetail(
        id=str(chat.id),
        listing_id=str(listing.id),
        listing_title=listing.title,
        listing_image=listing.images[0] if listing.images else None,
        listing_price=listing.price,
        listing_status=listing.status,
        other_user_id=str(seller.id) if seller else "",
        other_user_name=seller.display_name if seller else "Seller",
        other_user_verified=seller.is_phone_verified if seller else False,
        is_seller=False,
        messages=[
            MessageResponse(
                id=str(m.id),
                chat_id=str(m.chat_id),
                sender_id=str(m.sender_id),
                sender_name="",
                text=m.text,
                image_url=m.image_url,
                is_read=m.is_read,
                created_at=m.created_at.isoformat(),
                is_mine=m.sender_id == user.id,
            )
            for m in sorted(chat.messages, key=lambda m: m.created_at)
        ],
    )


@router.get("/{chat_id}", response_model=ChatDetail)
async def get_chat(
    chat_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get chat details with messages."""
    result = await db.execute(
        select(Chat).where(Chat.id == chat_id).options(
            selectinload(Chat.listing),
            selectinload(Chat.buyer),
            selectinload(Chat.seller),
            selectinload(Chat.messages),
        )
    )
    chat = result.scalar_one_or_none()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check access
    if chat.buyer_id != user.id and chat.seller_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    is_seller = chat.seller_id == user.id
    other_user = chat.buyer if is_seller else chat.seller
    
    # Mark messages as read
    for msg in chat.messages:
        if msg.sender_id != user.id and not msg.is_read:
            msg.is_read = True
    
    return ChatDetail(
        id=str(chat.id),
        listing_id=str(chat.listing_id),
        listing_title=chat.listing.title if chat.listing else "Deleted",
        listing_image=chat.listing.images[0] if chat.listing and chat.listing.images else None,
        listing_price=chat.listing.price if chat.listing else 0,
        listing_status=chat.listing.status if chat.listing else "deleted",
        other_user_id=str(other_user.id) if other_user else "",
        other_user_name=other_user.display_name if other_user else "User",
        other_user_verified=other_user.is_phone_verified if other_user else False,
        is_seller=is_seller,
        messages=[
            MessageResponse(
                id=str(m.id),
                chat_id=str(m.chat_id),
                sender_id=str(m.sender_id),
                sender_name=chat.buyer.display_name if m.sender_id == chat.buyer_id else chat.seller.display_name,
                text=m.text,
                image_url=m.image_url,
                is_read=m.is_read,
                created_at=m.created_at.isoformat(),
                is_mine=m.sender_id == user.id,
            )
            for m in sorted(chat.messages, key=lambda m: m.created_at)
        ],
    )


@router.post("/{chat_id}/messages", response_model=MessageResponse)
async def send_message(
    chat_id: UUID,
    body: MessageCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Send a message in a chat."""
    chat = await db.get(Chat, chat_id)
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check access
    if chat.buyer_id != user.id and chat.seller_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create message
    message = Message(
        chat_id=chat_id,
        sender_id=user.id,
        text=body.text.strip(),
    )
    db.add(message)
    
    # Update chat last_message_at
    chat.last_message_at = datetime.now(UTC)
    
    await db.flush()
    await db.refresh(message)
    
    return MessageResponse(
        id=str(message.id),
        chat_id=str(message.chat_id),
        sender_id=str(message.sender_id),
        sender_name=user.display_name,
        text=message.text,
        image_url=message.image_url,
        is_read=message.is_read,
        created_at=message.created_at.isoformat(),
        is_mine=True,
    )


@router.get("/unread/count", response_model=UnreadCountResponse)
async def get_unread_count(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get total unread message count for current user."""
    # Get all chats for this user
    query = select(Chat).where(
        or_(Chat.buyer_id == user.id, Chat.seller_id == user.id),
        Chat.is_active == True,
    ).options(selectinload(Chat.messages))
    
    result = await db.execute(query)
    chats = result.scalars().all()
    
    # Count unread messages not sent by user
    total_unread = sum(
        len([m for m in chat.messages if not m.is_read and m.sender_id != user.id])
        for chat in chats
    )
    
    return UnreadCountResponse(count=total_unread)


@router.get("/{chat_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    chat_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    after: str | None = None,
):
    """Get messages for a chat (for polling new messages)."""
    chat = await db.get(Chat, chat_id)
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check access
    if chat.buyer_id != user.id and chat.seller_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = select(Message).where(Message.chat_id == chat_id)
    
    if after:
        query = query.where(Message.created_at > datetime.fromisoformat(after))
    
    query = query.order_by(Message.created_at)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    # Mark as read
    for msg in messages:
        if msg.sender_id != user.id and not msg.is_read:
            msg.is_read = True
    
    return [
        MessageResponse(
            id=str(m.id),
            chat_id=str(m.chat_id),
            sender_id=str(m.sender_id),
            sender_name="",
            text=m.text,
            image_url=m.image_url,
            is_read=m.is_read,
            created_at=m.created_at.isoformat(),
            is_mine=m.sender_id == user.id,
        )
        for m in messages
    ]
