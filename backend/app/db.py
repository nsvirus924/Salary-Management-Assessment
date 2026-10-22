"""Database engine and session helpers."""
from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from fastapi import Request
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


def make_engine(url: str) -> Engine:
    """Create an engine. SQLite gets foreign keys enabled and WAL for concurrent reads."""
    if not url.startswith("sqlite"):
        return create_engine(url, pool_pre_ping=True)

    in_memory = url in ("sqlite://", "sqlite:///:memory:")
    if not in_memory:
        Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(
        url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool if in_memory else None,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):  # pragma: no cover - trivial
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        if not in_memory:
            cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    return engine


def get_db(request: Request) -> Iterator[Session]:
    """FastAPI dependency: one session per request, taken from the app's session factory."""
    session: Session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()
