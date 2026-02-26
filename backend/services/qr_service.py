"""
// filepath: backend/services/qr_service.py

QR-code generation for greeting cards.
Encodes a public URL → returns PNG bytes.
"""
import io
import uuid

import qrcode
from qrcode.constants import ERROR_CORRECT_M

from backend.core.config import settings


def generate_greeting_qr(token: uuid.UUID) -> bytes:
    """
    Generate a QR-code PNG for a greeting token.

    The encoded URL points to the public greeting viewer page:
        {webhook_host}/greeting/{token}

    Returns raw PNG bytes.
    """
    url = f"{settings.webhook_host.rstrip('/')}/greeting/{token}"

    qr = qrcode.QRCode(
        version=None,          # auto-size
        error_correction=ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Use brand colours: deep-green fill, cream background
    img = qr.make_image(fill_color="#1c3610", back_color="#faf8f2")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def greeting_public_url(token: uuid.UUID) -> str:
    """Return the canonical public URL embedded in the QR code."""
    return f"{settings.webhook_host.rstrip('/')}/greeting/{token}"
