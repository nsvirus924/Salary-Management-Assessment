"""App factory. Run with: uvicorn app.main:create_app --factory"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Engine
from sqlalchemy.orm import sessionmaker

from app.api import health
from app.config import Settings, get_settings
from app.db import Base, make_engine


def create_app(settings: Settings | None = None, engine: Engine | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = engine or make_engine(settings.database_url)
    Base.metadata.create_all(engine)

    app = FastAPI(title="ACME Salary Manager", version="1.0.0")
    app.state.session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(health.router, prefix="/api")
    return app
