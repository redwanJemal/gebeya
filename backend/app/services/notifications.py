"""Telegram notification service."""

import httpx
import os
from typing import Optional

BOT_TOKEN = os.getenv("BOT_TOKEN")
BOT_USERNAME = os.getenv("BOT_USERNAME", "ContactNayaBot")


async def send_telegram_notification(
    telegram_id: int,
    text: str,
    listing_id: Optional[str] = None,
    chat_id: Optional[str] = None,
) -> bool:
    """Send a notification to a user via Telegram bot."""
    if not BOT_TOKEN:
        print("No BOT_TOKEN configured, skipping notification")
        return False
    
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    # Build inline keyboard with button to open the chat
    reply_markup = None
    if listing_id:
        # Deep link to open the listing in the mini app
        web_app_url = f"https://t.me/{BOT_USERNAME}/app?startapp=l_{listing_id}"
        reply_markup = {
            "inline_keyboard": [[
                {
                    "text": "💬 መልስ ስጥ / Reply",
                    "url": web_app_url
                }
            ]]
        }
    
    payload = {
        "chat_id": telegram_id,
        "text": text,
        "parse_mode": "HTML",
    }
    
    if reply_markup:
        payload["reply_markup"] = reply_markup
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            
            if response.status_code == 200:
                return True
            else:
                print(f"Telegram API error: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        print(f"Failed to send Telegram notification: {e}")
        return False


async def notify_new_message(
    recipient_telegram_id: int,
    sender_name: str,
    listing_title: str,
    message_preview: str,
    listing_id: str,
) -> bool:
    """Notify user about a new message."""
    # Truncate message preview
    if len(message_preview) > 100:
        message_preview = message_preview[:97] + "..."
    
    text = (
        f"💬 <b>አዲስ መልእክት / New Message</b>\n\n"
        f"ከ <b>{sender_name}</b>\n"
        f"ስለ: {listing_title}\n\n"
        f"<i>{message_preview}</i>"
    )
    
    return await send_telegram_notification(
        telegram_id=recipient_telegram_id,
        text=text,
        listing_id=listing_id,
    )
