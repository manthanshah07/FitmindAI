from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from app.core.config import settings


# SQLAlchemy 2.x Declarative Base
class Base(DeclarativeBase):
    pass


# Engine setup with connection pool parameters
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
engine_kwargs = {
    "pool_pre_ping": True,
    "echo": False,
}

if not is_sqlite:
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_recycle": 300,
    })

engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs,
)


# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """Dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
