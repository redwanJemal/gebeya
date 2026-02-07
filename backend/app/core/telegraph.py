"""Free image hosting utility.

Uses catbox.moe for free, permanent image hosting.
No API key required. URLs never expire.
Alternative to Telegraph which has issues.
"""

import httpx
import base64
import re
from typing import Optional

CATBOX_UPLOAD_URL = "https://catbox.moe/user/api.php"

# Max file size: 200MB (Catbox limit)
MAX_FILE_SIZE = 200 * 1024 * 1024


class ImageUploadError(Exception):
    """Raised when image upload fails."""
    pass


async def upload_to_catbox(image_data: bytes, filename: str = "image.jpg") -> str:
    """
    Upload an image to Catbox and return the permanent URL.
    
    Args:
        image_data: Raw image bytes
        filename: Filename with extension
    
    Returns:
        Permanent Catbox URL (e.g., https://files.catbox.moe/abc123.jpg)
    
    Raises:
        ImageUploadError: If upload fails
    """
    if len(image_data) > MAX_FILE_SIZE:
        raise ImageUploadError(f"File too large. Max size: {MAX_FILE_SIZE // 1024 // 1024}MB")
    
    if len(image_data) < 100:
        raise ImageUploadError("File too small - may be invalid")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                CATBOX_UPLOAD_URL,
                data={"reqtype": "fileupload"},
                files={"fileToUpload": (filename, image_data)}
            )
            
            result = response.text.strip()
            
            # Catbox returns the URL directly on success
            if result.startswith("https://files.catbox.moe/"):
                return result
            else:
                raise ImageUploadError(f"Upload failed: {result}")
                
        except httpx.HTTPStatusError as e:
            raise ImageUploadError(f"HTTP error: {e.response.status_code}")
        except httpx.RequestError as e:
            raise ImageUploadError(f"Request failed: {str(e)}")


async def upload_base64_to_catbox(base64_string: str) -> str:
    """
    Upload a base64-encoded image to Catbox.
    
    Args:
        base64_string: Base64 string, optionally with data URL prefix
                      (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
    
    Returns:
        Permanent Catbox URL
    """
    # Remove data URL prefix if present
    filename = "image.jpg"
    if base64_string.startswith('data:'):
        # Extract the base64 part after the comma
        match = re.match(r'data:image/(\w+);base64,(.+)', base64_string)
        if match:
            ext = match.group(1)
            if ext == 'jpeg':
                ext = 'jpg'
            base64_string = match.group(2)
            filename = f"image.{ext}"
        else:
            # Fallback: just remove everything before the comma
            base64_string = base64_string.split(',', 1)[-1]
    
    # Decode base64
    try:
        image_data = base64.b64decode(base64_string)
    except Exception as e:
        raise ImageUploadError(f"Invalid base64: {str(e)}")
    
    return await upload_to_catbox(image_data, filename)


async def process_images(images: list[str]) -> list[str]:
    """
    Process a list of images - upload base64 to Catbox, keep URLs as-is.
    
    Args:
        images: List of image strings (base64 or URLs)
    
    Returns:
        List of URLs (Catbox URLs for uploaded images, original URLs for others)
    """
    processed = []
    
    for img in images:
        if not img:
            continue
            
        # Check if it's already a URL (keep as-is)
        if img.startswith('http://') or img.startswith('https://'):
            processed.append(img)
            continue
        
        # Check if it's base64 (with or without data URL prefix)
        if img.startswith('data:image/') or _looks_like_base64(img):
            try:
                url = await upload_base64_to_catbox(img)
                processed.append(url)
                print(f"✅ Uploaded image to Catbox: {url}")
            except ImageUploadError as e:
                # Log error but continue with other images
                print(f"⚠️ Image upload failed: {e}")
                continue
        else:
            # Unknown format, skip
            print(f"⚠️ Skipping unknown image format: {img[:50]}...")
            continue
    
    return processed


def _looks_like_base64(s: str) -> bool:
    """Check if a string looks like base64-encoded data."""
    if len(s) < 100:  # Too short to be an image
        return False
    # Base64 characters only (check first 100 chars)
    return bool(re.match(r'^[A-Za-z0-9+/=]+$', s[:100]))
