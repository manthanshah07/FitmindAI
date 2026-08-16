import pytest
from pydantic import ValidationError
from app.core.config import Settings


def test_development_environment_uses_default_jwt_secret():
    settings = Settings(ENVIRONMENT="development")
    assert settings.ENVIRONMENT == "development"
    assert settings.JWT_SECRET == "default_dev_secret_change_me_in_production_32_bytes"


def test_production_environment_rejects_default_jwt_secret():
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET="default_dev_secret_change_me_in_production_32_bytes",
        )
    assert "JWT_SECRET must be explicitly set and cannot use the development fallback" in str(
        exc_info.value
    )


def test_production_environment_rejects_short_jwt_secret():
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET="short_secret_under_32_chars",
        )
    assert "JWT_SECRET must be at least 32 characters long in production mode" in str(
        exc_info.value
    )


def test_production_environment_accepts_strong_jwt_secret():
    strong_secret = "a_very_secure_production_secret_key_that_is_32_bytes_or_longer"
    settings = Settings(
        ENVIRONMENT="production",
        JWT_SECRET=strong_secret,
    )
    assert settings.ENVIRONMENT == "production"
    assert settings.JWT_SECRET == strong_secret
