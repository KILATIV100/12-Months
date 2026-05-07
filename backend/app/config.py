from pydantic import Field
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

    @property
    def webhook_url(self) -> str:
        return f"{self.webhook_host.rstrip('/')}{self.webhook_path}"


settings = Settings()
