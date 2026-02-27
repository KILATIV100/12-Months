"""
// filepath: backend/services/ai_service.py

Claude AI integration (Anthropic SDK).

Functions:
  analyze_taste()              — taste summary after Tinder swipe session
  generate_event_suggestions() — bouquet picks for an upcoming calendar event
  generate_greeting_text()     — greeting card text generator
  get_constructor_hint()       — single florist tip for the 2D constructor
"""
import logging
from typing import Any

import anthropic

from backend.core.config import settings

logger = logging.getLogger(__name__)

# Lazy singleton — created once per process
_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


# ══════════════════════════════════════════════════════════════════════════════
#  Tinder taste analysis
# ══════════════════════════════════════════════════════════════════════════════

async def analyze_taste(
    liked_names: list[str],
    disliked_names: list[str],
) -> str:
    """
    Send liked / disliked bouquet names to Claude and receive a short
    Ukrainian taste summary.

    Returns 1-2 sentences, e.g.:
    "Вам подобаються пастельні кольори та об'ємні, повітряні форми."
    """
    liked_str    = ", ".join(liked_names)    if liked_names    else "не обрано"
    disliked_str = ", ".join(disliked_names) if disliked_names else "не обрано"

    prompt = (
        "Ти флорист-консультант у преміум квітковому магазині «12 Місяців».\n"
        "Клієнт переглядав каталог букетів у режимі Тіндер.\n\n"
        f"Сподобались: {liked_str}\n"
        f"Не сподобались: {disliked_str}\n\n"
        "Напиши КОРОТКЕ (1–2 речення) резюме смаку клієнта українською мовою.\n"
        "Акцент на кольорах, стилі, формі або настрої букетів.\n"
        "Починай зі слів «Вам подобаються…» або «Ваш смак —…».\n"
        "Тільки текст, без списків та спецсимволів."
    )

    client = _get_client()
    try:
        message = await client.messages.create(
            model=settings.claude_model,
            max_tokens=settings.claude_max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    except Exception as exc:
        logger.exception("Claude taste-analysis failed: %s", exc)
        if liked_names:
            return f"Вам подобаються {liked_names[0]} та схожі композиції."
        return "Ваш смак — вишуканий та індивідуальний."


# ══════════════════════════════════════════════════════════════════════════════
#  Calendar event — bouquet suggestions
# ══════════════════════════════════════════════════════════════════════════════

async def generate_event_suggestions(
    event_label: str,
    user_history: list[str],
    catalog: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Given an upcoming calendar event, ask Claude to choose the 3 most
    relevant bouquets from the available catalogue.

    Args:
        event_label:  Human-readable event name, e.g. "День народження Мамі".
        user_history: Names of products from the user's previous orders
                      (used to personalise suggestions).
        catalog:      List of available products — each dict must contain at
                      least: {"id": str, "name": str, "category": str|None,
                               "base_price": float}.

    Returns:
        Up to 3 product dicts from `catalog` (subset with same structure).
        Falls back to the first 3 items in `catalog` on any error.
    """
    if not catalog:
        return []

    # Build a compact product list for the prompt (avoid token bloat)
    catalog_lines = "\n".join(
        f"- ID:{p['id']} | {p['name']} | {p.get('category', '—')} | {p['base_price']} грн"
        for p in catalog[:30]  # limit to 30 products
    )

    history_str = (
        ", ".join(user_history[:10]) if user_history else "немає даних про попередні покупки"
    )

    prompt = (
        "Ти флорист-консультант у магазині «12 Місяців».\n"
        f"Подія клієнта: {event_label}\n"
        f"Попередні покупки клієнта: {history_str}\n\n"
        "Доступні букети в каталозі:\n"
        f"{catalog_lines}\n\n"
        "Обери РІВНО 3 букети з каталогу, які найкраще підійдуть для цієї події.\n"
        "Враховуй тип події, попередні вподобання клієнта та ціновий діапазон.\n"
        "Відповідь ТІЛЬКИ у форматі:\n"
        "ID1\nID2\nID3\n"
        "Без пояснень, без інших символів — тільки три ID через новий рядок."
    )

    client = _get_client()
    selected_ids: list[str] = []

    try:
        message = await client.messages.create(
            model=settings.claude_model,
            max_tokens=64,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        # Parse exactly 3 IDs
        selected_ids = [line.strip() for line in raw.splitlines() if line.strip()][:3]
    except Exception as exc:
        logger.exception("Claude event suggestions failed: %s", exc)
        # Graceful fallback — return first 3 from catalog
        return catalog[:3]

    # Map IDs back to full product dicts
    id_map = {str(p["id"]): p for p in catalog}
    result: list[dict] = []
    for sid in selected_ids:
        product = id_map.get(sid)
        if product:
            result.append(product)

    # Pad with catalog items if AI returned fewer than 3 valid IDs
    if len(result) < 3:
        seen = {p["id"] for p in result}
        for p in catalog:
            if p["id"] not in seen:
                result.append(p)
                if len(result) >= 3:
                    break

    return result[:3]


# ══════════════════════════════════════════════════════════════════════════════
#  Greeting card text
# ══════════════════════════════════════════════════════════════════════════════

async def generate_greeting_text(
    occasion: str,
    recipient: str,
    tone: str = "тепло та щиро",
) -> str:
    """
    Generate a short greeting card text for the recipient.

    Returns 2-4 sentences in Ukrainian.
    """
    prompt = (
        f"Напиши привітальний текст для листівки до букету квітів.\n"
        f"Привід: {occasion}\n"
        f"Кому: {recipient}\n"
        f"Тон: {tone}\n\n"
        "2–4 речення. Красиво та щиро. Тільки текст листівки, без пояснень."
    )

    client = _get_client()
    try:
        message = await client.messages.create(
            model=settings.claude_model,
            max_tokens=128,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    except Exception as exc:
        logger.exception("Claude greeting generation failed: %s", exc)
        return "З найщирішими побажаннями та любов'ю!"


# ══════════════════════════════════════════════════════════════════════════════
#  2D Constructor — florist hint
# ══════════════════════════════════════════════════════════════════════════════

async def get_constructor_hint(
    flowers_list: list[str],
    budget: int,
    occasion: str,
) -> str:
    """
    Ask Claude Haiku for ONE short florist tip (≤ 15 words) for the
    current bouquet composition in the 2D constructor.

    Args:
        flowers_list: Human-readable names of elements already in the bouquet
                      (e.g. ["🌹 Троянда", "🌷 Тюльпан", "🌿 Евкаліпт"]).
        budget:       Current total price in UAH (packaging + flowers).
        occasion:     Optional event, e.g. "День народження" or "".

    Returns:
        A single Ukrainian sentence ≤ 15 words starting with a verb.
        Falls back to a static hint on any error.
    """
    composition = (
        ", ".join(flowers_list) if flowers_list else "букет ще порожній"
    )
    occasion_str = occasion if occasion else "без конкретного приводу"

    prompt = (
        "Ти флорист у преміум магазині «12 Місяців».\n"
        f"Склад букету: {composition}\n"
        f"Бюджет: {budget} грн\n"
        f"Привід: {occasion_str}\n\n"
        "Дай ОДНУ коротку пораду до 15 слів — що додати, прибрати або змінити.\n"
        "Починай з дієслова (Додайте, Спробуйте, Замініть, Поєднайте…).\n"
        "Відповідь: тільки одне речення, без пояснень."
    )

    client = _get_client()
    try:
        message = await client.messages.create(
            model=settings.claude_model,
            max_tokens=64,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        # Truncate to first sentence just in case
        sentence = raw.split(".")[0].strip()
        return sentence + "." if sentence and not sentence.endswith(".") else sentence
    except Exception as exc:
        logger.exception("Claude constructor hint failed: %s", exc)
        # Static fallback hints
        fallbacks = [
            "Додайте евкаліпт для свіжості та обсягу.",
            "Спробуйте поєднати пастельні та яскраві кольори.",
            "Додайте піон — він стане акцентом композиції.",
            "Збалансуйте кількість зелені та квітів 1 до 3.",
        ]
        import random
        return random.choice(fallbacks)
