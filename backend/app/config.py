from __future__ import annotations

import os

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_REPO_ROOT = os.path.dirname(_BACKEND_ROOT)
_DEFAULT_DB_PATH = os.path.join(_REPO_ROOT, "data", "app.db")
_DEFAULT_DATABASE_URL = f"sqlite:///{_DEFAULT_DB_PATH}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    secret_key: str = "change-me-in-production-use-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = _DEFAULT_DATABASE_URL
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    max_ta_hours_default: int = 20


settings = Settings()
