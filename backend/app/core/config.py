from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    
    # Security & Auth
    JWT_SECRET: str = "default_dev_secret_change_me_in_production_32_bytes"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_REGISTER: str = "3/minute"
    RATE_LIMIT_COACH: str = "10/minute"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/fitmind_db"
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # AI Provider Settings (Gemini Developer API Free Tier)
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"
    GEMINI_TIMEOUT_SECONDS: float = 30.0
    SUPABASE_URL: str | None = None
    SUPABASE_SERVICE_KEY: str | None = None

    @model_validator(mode="after")
    def validate_production_jwt_secret(self) -> "Settings":
        DEFAULT_DEV_SECRET = "default_dev_secret_change_me_in_production_32_bytes"
        if self.ENVIRONMENT.lower() == "production":
            if not self.JWT_SECRET or self.JWT_SECRET == DEFAULT_DEV_SECRET:
                raise ValueError(
                    "JWT_SECRET must be explicitly set and cannot use the development fallback in production mode."
                )
            if len(self.JWT_SECRET) < 32:
                raise ValueError(
                    "JWT_SECRET must be at least 32 characters long in production mode."
                )
            if isinstance(self.CORS_ORIGINS, list) and "*" in self.CORS_ORIGINS:
                raise ValueError(
                    "CORS_ORIGINS cannot include wildcards ('*') in production mode."
                )
        return self

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


settings = Settings()
