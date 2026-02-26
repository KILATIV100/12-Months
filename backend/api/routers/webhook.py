"""FastAPI webhook router — receives Telegram updates via POST /webhook.

Telegram sends all updates to this endpoint when webhook mode is active.
The update is passed to the aiogram Dispatcher which routes it to the
correct handler based on filters, FSM state, etc.

Security:
  The route is protected by a secret token that Telegram includes in the
  X-Telegram-Bot-Api-Secret-Token header (set during setWebhook call).
  Requests without a valid token receive HTTP 403.
"""
import hashlib
import hmac
import logging

from aiogram.types import Update
from fastapi import APIRouter, Header, HTTPException, Request, status

from backend.bot.instance import bot, dp
from backend.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["webhook"])


@router.post(settings.webhook_path, include_in_schema=False)
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict:
    """Receive a Telegram Update and feed it to the aiogram Dispatcher.

    Telegram passes the secret token set during setWebhook in the
    X-Telegram-Bot-Api-Secret-Token header. We compare it in constant
    time to avoid timing attacks.
    """
    # ── Secret-token validation ────────────────────────────────
    expected = getattr(settings, "webhook_secret", None)
    if expected:
        if x_telegram_bot_api_secret_token is None:
            logger.warning("Webhook request missing secret token header.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Missing secret token",
            )
        # hmac.compare_digest requires same type; encode both to bytes
        if not hmac.compare_digest(
            x_telegram_bot_api_secret_token.encode(),
            expected.encode(),
        ):
            logger.warning("Webhook request has invalid secret token.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid secret token",
            )

    # ── Parse and dispatch ─────────────────────────────────────
    try:
        body = await request.json()
        update = Update.model_validate(body)
    except Exception as exc:
        logger.error("Failed to parse Telegram update: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid update payload",
        ) from exc

    await dp.feed_update(bot=bot, update=update)
    return {"ok": True}
