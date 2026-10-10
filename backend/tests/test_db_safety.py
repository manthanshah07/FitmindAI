import os
import pytest
from app.core.db_safety import is_safe_database_url, enforce_database_safety


class TestIsSafeDatabaseUrl:
    @pytest.mark.parametrize(
        "url",
        [
            "sqlite:///:memory:",
            "sqlite:///./dev.db",
            "sqlite:////var/data/app.db",
            "sqlite+pysqlite:///test.db",
            "postgresql://postgres:postgres@localhost:5432/fitmind_db",
            "postgresql://postgres:postgres@127.0.0.1:5432/fitmind_db",
            "postgresql://postgres:postgres@[::1]:5432/fitmind_db",
            "postgresql+psycopg://postgres:postgres@localhost:5432/fitmind_db",
            "postgresql://postgres:postgres@/fitmind_db",  # Hostless / Unix socket
        ],
    )
    def test_safe_urls_return_true(self, url: str):
        assert is_safe_database_url(url) is True

    @pytest.mark.parametrize(
        "url",
        [
            "postgresql://user:secret@ep-cool-fog-123456.us-east-2.aws.neon.tech/fitmind",
            "postgresql://user:secret@dpg-abcde12345.oregon-postgres.render.com/fitmind",
            "postgresql://user:secret@192.168.1.50:5432/fitmind",
            "postgresql://user:secret@database.internal.corp:5432/fitmind",
            "mysql://root:secret@remote-mysql.example.com/fitmind",
        ],
    )
    def test_remote_urls_return_false(self, url: str):
        assert is_safe_database_url(url) is False

    @pytest.mark.parametrize(
        "bad_url",
        [
            "",
            "   ",
            None,
            "://invalid-url",
        ],
    )
    def test_empty_or_invalid_urls_return_false(self, bad_url):
        assert is_safe_database_url(bad_url) is False


class TestEnforceDatabaseSafety:
    def test_sqlite_allowed_without_override(self, monkeypatch):
        monkeypatch.delenv("ALLOW_REMOTE_DB", raising=False)
        # Should not raise
        enforce_database_safety("sqlite:///./dev.db")
        enforce_database_safety("sqlite:///:memory:")

    def test_localhost_allowed_without_override(self, monkeypatch):
        monkeypatch.delenv("ALLOW_REMOTE_DB", raising=False)
        # Should not raise
        enforce_database_safety("postgresql://postgres:postgres@localhost:5432/fitmind_db")
        enforce_database_safety("postgresql://postgres:postgres@127.0.0.1:5432/fitmind_db")

    @pytest.mark.parametrize(
        "env_val",
        [None, "", "0", "false", "no"],
    )
    def test_remote_host_blocked_without_override(self, monkeypatch, env_val):
        if env_val is None:
            monkeypatch.delenv("ALLOW_REMOTE_DB", raising=False)
        else:
            monkeypatch.setenv("ALLOW_REMOTE_DB", env_val)

        remote_url = "postgresql://user:secret@ep-prod-01.neon.tech:5432/fitmind_prod"
        with pytest.raises(RuntimeError) as exc_info:
            enforce_database_safety(remote_url)

        err_msg = str(exc_info.value)
        assert "Database safety guard triggered" in err_msg
        assert "ep-prod-01.neon.tech" in err_msg
        assert "ALLOW_REMOTE_DB=1" in err_msg

    def test_remote_host_allowed_with_explicit_override(self, monkeypatch):
        monkeypatch.setenv("ALLOW_REMOTE_DB", "1")
        remote_url = "postgresql://user:secret@ep-prod-01.neon.tech:5432/fitmind_prod"
        # Must not raise when ALLOW_REMOTE_DB == "1"
        enforce_database_safety(remote_url)

    def test_custom_override_env_variable(self, monkeypatch):
        monkeypatch.delenv("CUSTOM_REMOTE_FLAG", raising=False)
        remote_url = "postgresql://user:secret@ep-prod-01.neon.tech:5432/fitmind_prod"

        with pytest.raises(RuntimeError):
            enforce_database_safety(remote_url, allow_remote_env="CUSTOM_REMOTE_FLAG")

        monkeypatch.setenv("CUSTOM_REMOTE_FLAG", "1")
        enforce_database_safety(remote_url, allow_remote_env="CUSTOM_REMOTE_FLAG")
