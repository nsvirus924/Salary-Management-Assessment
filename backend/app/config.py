"""Application settings, read from environment variables with sensible local defaults."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    database_url: str = f"sqlite:///{BACKEND_DIR / 'data' / 'salary.db'}"
    frontend_dist: Path | None = None
    cors_origins: list[str] = field(default_factory=lambda: ["http://localhost:5173"])


def get_settings() -> Settings:
    dist = os.getenv("FRONTEND_DIST")
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return Settings(
        database_url=os.getenv("DATABASE_URL", Settings.database_url),
        frontend_dist=Path(dist) if dist else None,
        cors_origins=[o.strip() for o in origins.split(",") if o.strip()],
    )
