"""
// filepath: backend/services/storage_service.py

Cloudflare R2 (S3-compatible) async upload/delete service.
Uses boto3 in a thread-pool executor to avoid blocking the event loop.
"""
import asyncio
import mimetypes
from functools import partial

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from backend.core.config import settings


def _make_client():
    """Create a boto3 S3 client pointed at Cloudflare R2."""
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4", max_pool_connections=10),
    )


async def upload_bytes(
    data: bytes,
    object_key: str,
    content_type: str | None = None,
) -> str:
    """
    Upload raw bytes to R2.

    Args:
        data:         File content as bytes.
        object_key:   Path inside the bucket, e.g. "greetings/abc123.mp4".
        content_type: MIME type; auto-detected from object_key when omitted.

    Returns:
        Public URL of the uploaded object.
    """
    if not content_type:
        guessed, _ = mimetypes.guess_type(object_key)
        content_type = guessed or "application/octet-stream"

    client = _make_client()
    loop = asyncio.get_event_loop()

    put_fn = partial(
        client.put_object,
        Bucket=settings.r2_bucket_name,
        Key=object_key,
        Body=data,
        ContentType=content_type,
    )
    await loop.run_in_executor(None, put_fn)

    return f"{settings.r2_public_url.rstrip('/')}/{object_key}"


async def delete_object(object_key: str) -> None:
    """
    Delete an object from R2 (best-effort; ignores NoSuchKey errors).
    """
    client = _make_client()
    loop = asyncio.get_event_loop()

    del_fn = partial(
        client.delete_object,
        Bucket=settings.r2_bucket_name,
        Key=object_key,
    )
    try:
        await loop.run_in_executor(None, del_fn)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code != "NoSuchKey":
            raise


async def object_exists(object_key: str) -> bool:
    """Return True if an object with this key exists in the bucket."""
    client = _make_client()
    loop = asyncio.get_event_loop()

    head_fn = partial(
        client.head_object,
        Bucket=settings.r2_bucket_name,
        Key=object_key,
    )
    try:
        await loop.run_in_executor(None, head_fn)
        return True
    except ClientError:
        return False
