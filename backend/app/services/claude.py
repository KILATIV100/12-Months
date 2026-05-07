"""Claude API integration per TZ §08. Three scenarios."""
from __future__ import annotations

import json
import logging
from typing import Any

from anthropic import AsyncAnthropic

from app.config import settings

log = logging.getLogger(__name__)

_client: AsyncAnthropic | None = None


def _get_client() -> AsyncAnthropic | None:
    global _client
    if not settings.anthropic_api_key:
        return None
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def _ask(prompt: str, system: str = "Ти досвідчений флорист 12 Months.", max_tokens: int = 200) -> str:
    client = _get_client()
    if client is None:
        log.warning("ANTHROPIC_API_KEY not set, returning empty hint")
        return ""
    resp = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    parts = [b.text for b in resp.content if getattr(b, "text", None)]
    return "".join(parts).strip()


async def constructor_hint(flowers_list: str, budget: int, occasion: str) -> str:
    """TZ §08 Сценарій 01 — порада в реальному часі (debounce 1.5s on client)."""
    prompt = (
        f"Склад букету: {flowers_list}\n"
        f"Залишок бюджету: {budget} грн\n"
        f"Привід: {occasion}\n\n"
        "Дай ОДНУ пораду до 15 слів. Тільки порада."
    )
    return await _ask(prompt, max_tokens=120)


async def tinder_taste(liked: list[str], disliked: list[str]) -> str:
    """TZ §08 Сценарій 02 — аналіз смаку після 10+ свайпів."""
    prompt = (
        f"Вподобані букети: {', '.join(liked)}\n"
        f"Не сподобались: {', '.join(disliked)}\n\n"
        "Визнач 3 ключові характеристики смаку.\n"
        'Формат: "Вам подобається: X, Y, Z"'
    )
    return await _ask(prompt, max_tokens=120)


async def reminder_picks(order_history: list[dict[str, Any]], event_label: str, catalog: list[dict[str, Any]]) -> dict:
    """TZ §08 Сценарій 03 — персональна добірка до події. Викликається за 3 дні."""
    prompt = (
        f"Попередні замовлення клієнта: {json.dumps(order_history, ensure_ascii=False)}\n"
        f"Подія: {event_label}\n"
        f"Доступні букети: {json.dumps(catalog, ensure_ascii=False)}\n\n"
        "Запропонуй 3 найкращих варіанти. Поверни JSON у форматі: "
        '{"items":[{"id":"uuid","reason":"коротке пояснення"}]}'
    )
    raw = await _ask(prompt, max_tokens=300)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        log.exception("Failed to parse Claude reminder_picks response: %r", raw)
        return {"items": []}
