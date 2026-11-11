import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Intelligent Data Analytics & Predictive Intelligence Platform"
    API_V1_STR: str = "/api"
    
    # Storage Paths
    BASE_DIR: Path = BASE_DIR
    STORAGE_DIR: Path = BASE_DIR / "storage"
    UPLOAD_DIR: Path = STORAGE_DIR / "uploads"
    PROCESSED_DIR: Path = STORAGE_DIR / "processed"
    MODELS_DIR: Path = STORAGE_DIR / "models"
    REPORTS_DIR: Path = STORAGE_DIR / "reports"
    DUCKDB_DIR: Path = STORAGE_DIR / "duckdb"
    
    # SQLite Database
    SQLITE_DB_PATH: Path = STORAGE_DIR / "platform.db"
    SQLALCHEMY_DATABASE_URI: str = f"sqlite:///{SQLITE_DB_PATH.as_posix()}"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-intelligent-analytics-platform-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # AI / LLM Configuration
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "none")  # none | gemini | openai | ollama
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")
    
    # Limits
    MAX_UPLOAD_SIZE_MB: int = 150
    QUERY_TIMEOUT_SECONDS: int = 30
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
for directory in [
    settings.STORAGE_DIR,
    settings.UPLOAD_DIR,
    settings.PROCESSED_DIR,
    settings.MODELS_DIR,
    settings.REPORTS_DIR,
    settings.DUCKDB_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)

