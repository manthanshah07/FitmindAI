import os
from typing import Optional
from sqlalchemy.engine.url import make_url

SAFE_HOSTS = frozenset({"localhost", "127.0.0.1", "::1", None, ""})


def is_safe_database_url(url: str) -> bool:
    """
    Determines whether a given database URL points to a safe local target (SQLite or localhost).
    
    Safe targets include:
    - SQLite databases (file-based or in-memory)
    - Hostless connection strings (e.g., local Unix sockets)
    - Explicit local loopback addresses ('localhost', '127.0.0.1', '::1')
    """
    if not url or not url.strip():
        return False

    try:
        url_obj = make_url(url.strip())
    except Exception:
        return False

    backend = url_obj.get_backend_name()
    if backend == "sqlite":
        return True

    host = url_obj.host
    if host in SAFE_HOSTS:
        return True

    return False


def enforce_database_safety(
    url: Optional[str] = None,
    allow_remote_env: str = "ALLOW_REMOTE_DB",
) -> None:
    """
    Refuses execution if the database connection string targets a non-local host,
    unless explicitly overridden by setting the environment variable ALLOW_REMOTE_DB=1.
    
    Raises:
        RuntimeError: If URL targets a non-local database and ALLOW_REMOTE_DB != "1".
    """
    target_url = url
    if not target_url:
        target_url = os.getenv("DATABASE_URL")

    if not target_url:
        from app.core.config import settings
        target_url = settings.DATABASE_URL

    if not target_url:
        raise RuntimeError("Database safety guard: No DATABASE_URL could be resolved.")

    if is_safe_database_url(target_url):
        return

    # Non-local target detected: verify explicit environment override
    override_val = os.getenv(allow_remote_env, "").strip()
    if override_val == "1":
        return

    try:
        url_obj = make_url(target_url)
        host_repr = url_obj.host or "unknown"
    except Exception:
        host_repr = "unparseable"

    raise RuntimeError(
        f"Database safety guard triggered: execution refused because DATABASE_URL "
        f"points to non-local host '{host_repr}'. "
        f"To allow remote execution against this database, explicitly set {allow_remote_env}=1."
    )
