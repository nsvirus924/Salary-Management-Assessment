"""App factory. Run with: uvicorn app.main:create_app --factory"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Engine
from sqlalchemy.orm import sessionmaker

from app.api import employees, health, meta
from app.config import Settings, get_settings
from app.db import Base, make_engine
from app.errors import DomainError
from app.reference_data import ensure_countries


def create_app(settings: Settings | None = None, engine: Engine | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = engine or make_engine(settings.database_url)
    Base.metadata.create_all(engine)

    app = FastAPI(title="ACME Salary Manager", version="1.0.0")
    app.state.session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    with app.state.session_factory() as session:
        ensure_countries(session)

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.exception_handler(DomainError)
    def _domain_error(_request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

    for router in (health.router, meta.router, employees.router):
        app.include_router(router, prefix="/api")
    return app
