import os
from pathlib import Path
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for backend
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables and backend/.env file.
    Keeps API secrets secure on the server side.
    """
    GOOGLE_PLACES_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
