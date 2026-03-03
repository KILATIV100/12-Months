from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, AliasChoices, field_validator
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────
    app_name: str = "12 Months API"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"  # development | production

    # ── Telegram ──────────────────────────────────────────────
    bot_token: str
    webhook_host: str  # https://yourdomain.com
    webhook_path: str = "/webhook"
    # Owner Telegram ID для доступу до /stats
    owner_tg_id: int
    # Bot username for referral links (without @)
    bot_username: str = ""
    # Optional direct URL for Telegram Mini App (if frontend hosted separately)
    web_app_url: Optional[str] = None

    @field_validator("webhook_host", mode="before")
    @classmethod
    def normalize_webhook_host(cls, v: str) -> str:
        if not isinstance(v, str):
            return v
        host = v.strip().rstrip("/")
        if host and not host.startswith(("http://", "https://")):
            host = f"https://{host}"
        return host

    @field_validator("web_app_url", mode="before")
    @classmethod
    def normalize_web_app_url(cls, v: Optional[str]) -> Optional[str]:
        if not isinstance(v, str):
            return v
        url = v.strip().rstrip("/")
        if url and not url.startswith(("http://", "https://")):
            url = f"https://{url}"
        return url or None

    @field_validator("webhook_host", mode="before")
    @classmethod
    def normalize_webhook_host(cls, v: str) -> str:
        if not isinstance(v, str):
            return v
        host = v.strip().rstrip("/")
        if host and not host.startswith(("http://", "https://")):
            host = f"https://{host}"
        return host

    @property
    def webhook_url(self) -> str:
        return f"{self.webhook_host}{self.webhook_path}"

    @property
    def telegram_web_app_url(self) -> str:
        if self.web_app_url:
            return self.web_app_url
        return f"{self.webhook_host}/app"

    # ── Database (PostgreSQL) ─────────────────────────────────
    # Підтримує як DATABASE_URL (Railway), так і окремі POSTGRES_* змінні
    database_url_raw: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("database_url_raw", "database_url"),
    )
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "twelve_months"
    postgres_user: str = "postgres"
    postgres_password: str = ""

    @property
    def database_url(self) -> str:
        if self.database_url_raw:
            url = self.database_url_raw
            # Railway дає postgres:// або postgresql://, asyncpg потребує postgresql+asyncpg://
            if url.startswith("postgres://"):
                url = "postgresql+asyncpg://" + url[len("postgres://"):]
            elif url.startswith("postgresql://"):
                url = "postgresql+asyncpg://" + url[len("postgresql://"):]
            return url
        return (
            f"postgresql+asyncpg://{self.postgres_user}:"
            f"{self.postgres_password}@{self.postgres_host}:"
            f"{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        """Для Alembic (sync)."""
        if self.database_url_raw:
            url = self.database_url_raw
            if url.startswith("postgres://"):
                url = "postgresql+psycopg2://" + url[len("postgres://"):]
            elif url.startswith("postgresql://"):
                url = "postgresql+psycopg2://" + url[len("postgresql://"):]
            elif url.startswith("postgresql+asyncpg://"):
                url = "postgresql+psycopg2://" + url[len("postgresql+asyncpg://"):]
            return url
        return (
            f"postgresql+psycopg2://{self.postgres_user}:"
            f"{self.postgres_password}@{self.postgres_host}:"
            f"{self.postgres_port}/{self.postgres_db}"
        )

    # ── Redis ─────────────────────────────────────────────────
    # Підтримує як REDIS_URL (Railway), так і окремі REDIS_* змінні
    redis_url_raw: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("redis_url_raw", "redis_url"),
    )
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None
    redis_db: int = 0

    @property
    def redis_url(self) -> str:
        if self.redis_url_raw:
            return self.redis_url_raw
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # ── Claude AI ─────────────────────────────────────────────
    anthropic_api_key: str
    # claude-haiku-4-5-20251001 для MVP, claude-sonnet-4-6 при масштабуванні
    claude_model: str = "claude-haiku-4-5-20251001"
    claude_max_tokens: int = 256
    # Debounce в секундах для конструктора
    ai_debounce_seconds: float = 1.5

    # ── Cloudflare R2 ─────────────────────────────────────────
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "twelve-months-media"
    r2_public_url: str = ""  # https://pub-xxx.r2.dev

    # ── Payments ──────────────────────────────────────────────
    # LiqPay
    liqpay_public_key: str = ""
    liqpay_private_key: str = ""
    # Monobank
    monobank_token: str = ""

    # ── Security ──────────────────────────────────────────────
    # Секрет для підпису QR-токенів
    secret_key: str
    # TTL сесії кошика в Redis (секунди)
    cart_session_ttl: int = 86400  # 24 год

    # ── Scheduler ─────────────────────────────────────────────
    # Час щоденної перевірки дат (UTC)
    reminder_check_hour: int = 6   # 9:00 Kyiv = 6:00 UTC
    reminder_check_minute: int = 0

    # ── CORS ──────────────────────────────────────────────────
    allowed_origins: list[str] = [
        "https://telegram.org",
        "https://web.telegram.org",
    ]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v


# Singleton — імпортуємо скрізь
settings = Settings()
