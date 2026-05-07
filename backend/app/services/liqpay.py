"""LiqPay integration stub. Real signing per LiqPay docs."""
from __future__ import annotations

import base64
import hashlib
import json

from app.config import settings


def make_payment(amount: float, order_id: str, description: str, result_url: str, server_url: str) -> dict:
    """Return data + signature for LiqPay checkout. Frontend embeds this in a button."""
    payload = {
        "version": "3",
        "public_key": settings.liqpay_public_key,
        "action": "pay",
        "amount": amount,
        "currency": "UAH",
        "description": description,
        "order_id": order_id,
        "result_url": result_url,
        "server_url": server_url,
    }
    data = base64.b64encode(json.dumps(payload).encode()).decode()
    raw = (settings.liqpay_private_key + data + settings.liqpay_private_key).encode()
    signature = base64.b64encode(hashlib.sha1(raw).digest()).decode()
    return {"data": data, "signature": signature}


def verify_callback(data: str, signature: str) -> bool:
    raw = (settings.liqpay_private_key + data + settings.liqpay_private_key).encode()
    expected = base64.b64encode(hashlib.sha1(raw).digest()).decode()
    return expected == signature
