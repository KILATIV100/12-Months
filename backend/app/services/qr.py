"""QR-code generation per TZ §04 Flow 2 (greeting card → QR)."""
from __future__ import annotations

import io
import uuid

import qrcode

from app.config import settings


def make_qr_token() -> uuid.UUID:
    return uuid.uuid4()


def greeting_url(token: uuid.UUID) -> str:
    base = settings.greeting_url or f"{settings.twa_url.rstrip('/')}/greeting"
    return f"{base.rstrip('/')}/{token}"


def render_qr_png(url: str, box_size: int = 10, border: int = 4) -> bytes:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1c3610", back_color="#faf8f2")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
