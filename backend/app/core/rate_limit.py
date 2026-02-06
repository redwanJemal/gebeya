"""Rate limiting middleware using Redis."""

import time
from typing import Optional
from fastapi import Request, HTTPException, status
from functools import wraps
import hashlib
import redis.asyncio as redis

from app.core.config import settings


class RateLimiter:
    """Redis-based rate limiter."""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
    
    async def connect(self):
        """Connect to Redis."""
        if not self.redis:
            self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    async def close(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
    
    async def is_rate_limited(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> tuple[bool, int, int]:
        """
        Check if request is rate limited.
        Returns: (is_limited, remaining, reset_time)
        """
        await self.connect()
        
        now = int(time.time())
        window_start = now - window_seconds
        
        # Use sliding window with Redis sorted set
        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)  # Remove old entries
        pipe.zadd(key, {f"{now}:{id(key)}": now})  # Add current request
        pipe.zcard(key)  # Count requests in window
        pipe.expire(key, window_seconds)  # Set expiry
        
        results = await pipe.execute()
        request_count = results[2]
        
        remaining = max(0, max_requests - request_count)
        reset_time = now + window_seconds
        
        return request_count > max_requests, remaining, reset_time


rate_limiter = RateLimiter()


def get_client_ip(request: Request) -> str:
    """Get client IP from request."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_rate_limit_key(request: Request, prefix: str = "rl") -> str:
    """Generate rate limit key from request."""
    client_ip = get_client_ip(request)
    # Hash IP for privacy
    ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()[:16]
    return f"{prefix}:{ip_hash}:{request.url.path}"


async def check_rate_limit(
    request: Request,
    max_requests: int = 60,
    window_seconds: int = 60,
    prefix: str = "rl"
) -> None:
    """
    Check rate limit and raise exception if exceeded.
    Default: 60 requests per minute.
    """
    key = get_rate_limit_key(request, prefix)
    
    try:
        is_limited, remaining, reset_time = await rate_limiter.is_rate_limited(
            key, max_requests, window_seconds
        )
        
        # Add rate limit headers
        request.state.rate_limit_remaining = remaining
        request.state.rate_limit_reset = reset_time
        
        if is_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={
                    "X-RateLimit-Remaining": str(remaining),
                    "X-RateLimit-Reset": str(reset_time),
                    "Retry-After": str(window_seconds),
                }
            )
    except redis.RedisError:
        # If Redis fails, allow the request (fail open)
        pass


# Rate limit configurations
RATE_LIMITS = {
    "auth": {"max_requests": 10, "window_seconds": 60},  # 10 per minute
    "listings": {"max_requests": 30, "window_seconds": 60},  # 30 per minute
    "messages": {"max_requests": 60, "window_seconds": 60},  # 60 per minute
    "default": {"max_requests": 100, "window_seconds": 60},  # 100 per minute
}
