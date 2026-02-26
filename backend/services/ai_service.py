"""
// filepath: backend/services/ai_service.py

Claude AI integration (Anthropic SDK).
Used for taste-analysis after a Tinder-mode swipe session.
"""
import logging

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


async def analyze_taste(
    liked_names: list[str],
    disliked_names: list[str],
) -> str:
    """
    Send liked / disliked bouquet names to Claude and receive a short
    Ukrainian taste summary.

    Args:
        liked_names:    Product names the user swiped right on.
        disliked_names: Product names the user swiped left on.

    Returns:
        1-2 sentence taste description in Ukrainian,
        e.g. "Вам подобаються пастельні кольори та об'ємні, повітряні форми."
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
        # Graceful fallback — never break the user flow
        if liked_names:
            return f"Вам подобаються {liked_names[0]} та схожі композиції."
        return "Ваш смак — вишуканий та індивідуальний."


async def generate_greeting_text(
    occasion: str,
    recipient: str,
    tone: str = "тепло та щиро",
) -> str:
    """
    Optional: generate a short greeting card text for the recipient.

    Args:
        occasion:  e.g. "День народження"
        recipient: e.g. "Мамі"
        tone:      e.g. "офіційно" | "грайливо" | "тепло та щиро"

    Returns:
        2-4 sentence greeting in Ukrainian.
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
