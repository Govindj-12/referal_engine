from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://referral:referral_secret@db:5432/referral_engine"
    SYNC_DATABASE_URL: str = "postgresql://referral:referral_secret@db:5432/referral_engine"
    REDIS_URL: str = "redis://redis:6379/0"
    REWARD_DEPTH: int = 3
    REWARD_PERCENT: float = 10.0
    VELOCITY_LIMIT: int = 5
    VELOCITY_WINDOW: int = 60  # seconds
    SECRET_KEY: str = "dev-secret"

    class Config:
        env_file = ".env"


settings = Settings()
