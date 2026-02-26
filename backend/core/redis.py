import json
from typing import Any, Optional

import redis.asyncio as aioredis

from backend.core.config import settings


# ── Connection Pool ───────────────────────────────────────────
_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_pool


async def close_redis() -> None:
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.aclose()
        _redis_pool = None


# ── Key Helpers ───────────────────────────────────────────────
def cart_key(tg_id: int) -> str:
    return f"cart:{tg_id}"


def swipe_session_key(tg_id: int) -> str:
    return f"swipe:{tg_id}"


def rate_limit_key(tg_id: int, action: str) -> str:
    return f"rl:{action}:{tg_id}"


# ── Cart Operations ───────────────────────────────────────────
async def get_cart(tg_id: int) -> dict:
    r = await get_redis()
    data = await r.get(cart_key(tg_id))
    if data:
        return json.loads(data)
    return {"items": [], "total": 0}


async def set_cart(tg_id: int, cart: dict) -> None:
    r = await get_redis()
    await r.setex(
        cart_key(tg_id),
        settings.cart_session_ttl,
        json.dumps(cart, ensure_ascii=False),
    )


async def clear_cart(tg_id: int) -> None:
    r = await get_redis()
    await r.delete(cart_key(tg_id))


# ── Generic Cache ─────────────────────────────────────────────
async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    r = await get_redis()
    await r.setex(key, ttl, json.dumps(value, ensure_ascii=False, default=str))


async def cache_get(key: str) -> Optional[Any]:
    r = await get_redis()
    data = await r.get(key)
    if data:
        return json.loads(data)
    return None


async def cache_delete(key: str) -> None:
    r = await get_redis()
    await r.delete(key)
