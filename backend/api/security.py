"""TWA (Telegram Web App) initData validation.

Implements the official Telegram algorithm:
  1. Parse URL-encoded initData query string
  2. Extract and remove the 'hash' field
  3. Sort remaining fields alphabetically, join as "key=value\\n..."
  4. Compute secret_key = HMAC-SHA256("WebAppData", bot_token)
  5. Compute expected_hash = HMAC-SHA256(secret_key, data_check_string)
  6. Compare expected_hash == provided_hash in constant time

Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""
import hashlib
import hmac
import json
import urllib.parse
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from backend.core.config import settings


# ── Core validation logic ──────────────────────────────────────────────────────

def validate_init_data(init_data_raw: str) -> dict:
    """Parse and validate Telegram TWA initData.

    Returns the parsed payload dict (with 'user' as a dict if present).
    Raises ValueError on any validation failure.
    """
    try:
        params = urllib.parse.parse_qs(
            init_data_raw,
            keep_blank_values=True,
            strict_parsing=False,
        )
        # parse_qs returns lists; flatten to single values
        data: dict[str, str] = {k: v[0] for k, v in params.items()}
    except Exception as exc:
        raise ValueError(f"Malformed initData: {exc}") from exc

    provided_hash = data.pop("hash", None)
    if not provided_hash:
        raise ValueError("initData is missing 'hash' field")

    # Build the data-check string (sorted alphabetically, \n-separated)
    check_string = "\n".join(
        f"{key}={data[key]}" for key in sorted(data.keys())
    )

    # secret_key = HMAC-SHA256(key="WebAppData", msg=bot_token)
    secret_key = hmac.new(
        b"WebAppData",
        settings.bot_token.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    # expected_hash = HMAC-SHA256(key=secret_key, msg=check_string)
    expected_hash = hmac.new(
        secret_key,
        check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, provided_hash):
        raise ValueError("initData signature is invalid")

    # Parse nested JSON fields
    if "user" in data:
        try:
            data["user"] = json.loads(data["user"])
        except json.JSONDecodeError:
            data["user"] = {}

    if "receiver" in data:
        try:
            data["receiver"] = json.loads(data["receiver"])
        except json.JSONDecodeError:
            pass

    if "chat" in data:
        try:
            data["chat"] = json.loads(data["chat"])
        except json.JSONDecodeError:
            pass

    return data


# ── FastAPI Dependency ─────────────────────────────────────────────────────────

async def get_current_twa_user(
    x_init_data: Annotated[str | None, Header(alias="X-Init-Data")] = None,
) -> dict:
    """FastAPI dependency — validates TWA initData and returns the Telegram user dict.

    In debug mode, if no initData is provided, returns a mock user so endpoints
    can be tested via Swagger UI without a Telegram client.

    Usage in router:
        @router.get("/me")
        async def get_me(tg_user: dict = Depends(get_current_twa_user)):
            return tg_user
    """
    if not x_init_data:
        if settings.debug:
            # Development fallback — allows Swagger UI testing
            return {
                "id": 0,
                "first_name": "Dev",
                "last_name": "User",
                "username": "dev",
                "language_code": "uk",
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Init-Data header",
        )

    try:
        payload = validate_init_data(x_init_data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    tg_user = payload.get("user")
    if not tg_user or not isinstance(tg_user, dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No user object in initData",
        )

    return tg_user
