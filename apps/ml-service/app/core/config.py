from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated at import time. A missing or malformed variable fails the
    boot, not the first request that needs it (RULE-deployment.md
    §Configuration, mirrored from apps/web/lib/env.ts)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    MODEL_DIR: str = Field(default="./models")
    LOG_LEVEL: str = Field(default="info", pattern="^(debug|info|warn|error)$")


settings = Settings()
