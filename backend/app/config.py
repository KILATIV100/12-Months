from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    debug: bool = False
    secret_key: str = "change-me"

    database_url: str
    redis_url: str

    bot_token: str
    owner_tg_id: int
    webhook_host: str
    webhook_path: str = "/bot/webhook"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"

    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "12months"
    r2_public_url: str = ""

    liqpay_public_key: str = ""
    liqpay_private_key: str = ""

    twa_url: str = ""
    greeting_url: str = ""

    @field_validator("webhook_host", mode="before")
    @classmethod
    def _normalize_webhook_host(cls, v: str) -> str:
        # Telegram requires an HTTPS URL. Railway domains are HTTPS, but if the
        # user enters the bare hostname we'd otherwise try to register
        # "myhost/api/webhook" which Telegram silently ignores.
        if not v:
            return v
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v.rstrip("/")

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_db_url(cls, v: str) -> str:
        # Railway / Heroku give "postgres://..." or "postgresql://..." —
        # force the asyncpg driver so SQLAlchemy's async engine works.
        if not v:
            return v
        if v.startswith("postgres://"):
            v = "postgresql://" + v[len("postgres://"):]
        if v.startswith("postgresql://") and "+" not in v.split("://", 1)[0]:
            v = "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v

    @property
    def sync_database_url(self) -> str:
        # Alembic needs the sync (psycopg) form.
        return self.database_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)

    @property
    def webhook_url(self) -> str:
        return f"{self.webhook_host.rstrip('/')}{self.webhook_path}"


settings = Settings()
