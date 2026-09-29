from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_name: str = "UnnatiTrack API"
    database_url: str = "sqlite:///./unnatitrack.db"  # PostgreSQL on Render; SQLite for zero-setup local dev
    jwt_secret: str = "change-me-please-use-a-long-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    allowed_origins: str = "http://localhost:5173,http://localhost:4173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
