"""Alembic Environment — async SQLAlchemy.

Reads DB URL from pydantic settings (which reads from .env).
Imports all models so their tables appear in Base.metadata for autogenerate.
"""
import asyncio
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# ── Path Setup ────────────────────────────────────────────────
# backend/migrations/env.py → project root is ../../
PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
sys.path.insert(0, os.path.abspath(PROJECT_ROOT))

# ── Settings & Base ───────────────────────────────────────────
from backend.core.config import settings  # noqa: E402
from backend.core.database import Base  # noqa: E402

# Import ALL models so their Table objects are registered in Base.metadata
# Without this, autogenerate won't see the tables
import backend.models.user  # noqa: F401, E402
import backend.models.product  # noqa: F401, E402
import backend.models.order  # noqa: F401, E402
import backend.models.date  # noqa: F401, E402
import backend.models.swipe  # noqa: F401, E402
import backend.models.subscription  # noqa: F401, E402
import backend.models.element  # noqa: F401, E402

# ── Alembic Config ────────────────────────────────────────────
config = context.config

# Override sqlalchemy.url from .env (never hardcode credentials)
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# ── Offline Mode (no DB connection) ──────────────────────────
def run_migrations_offline() -> None:
    """Generate SQL script without connecting to the database."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Compare server defaults so Alembic detects DEFAULT changes
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online Mode (real DB connection) ─────────────────────────
def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_server_default=True,
        # Include schemas if needed: include_schemas=True
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create async engine and run migrations."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # No connection pooling for migrations
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


# ── Entry Point ───────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
