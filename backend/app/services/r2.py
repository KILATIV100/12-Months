"""Cloudflare R2 storage. Upload photos/videos for products and greeting videos."""
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import BinaryIO

import boto3
from botocore.client import Config

from app.config import settings

log = logging.getLogger(__name__)

_client = None


def _r2():
    global _client
    if _client is None:
        if not settings.r2_account_id:
            return None
        _client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
    return _client


def is_configured() -> bool:
    return bool(settings.r2_account_id and settings.r2_public_url)


def upload_bytes(data: bytes | BinaryIO, key: str | None = None, content_type: str = "image/jpeg") -> str:
    """Upload bytes to R2 and return the public URL. Blocking — call via upload()."""
    client = _r2()
    if client is None:
        raise RuntimeError("R2 not configured")
    if key is None:
        key = f"uploads/{uuid.uuid4()}"
    if isinstance(data, bytes):
        client.put_object(Bucket=settings.r2_bucket_name, Key=key, Body=data, ContentType=content_type)
    else:
        client.upload_fileobj(data, settings.r2_bucket_name, key, ExtraArgs={"ContentType": content_type})
    return f"{settings.r2_public_url.rstrip('/')}/{key}"


async def upload(data: bytes, key: str | None = None, content_type: str = "image/jpeg") -> str:
    """Async wrapper — boto3 is sync, so run it off the event loop."""
    return await asyncio.to_thread(upload_bytes, data, key, content_type)

