from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import Base, make_engine
from app.main import create_app
from app.reference_data import ensure_countries
from app.schemas import EmployeeCreate
from app.services import employees as employee_service


@pytest.fixture
def engine():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        ensure_countries(session)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine):
    with Session(engine, expire_on_commit=False) as session:
        yield session


@pytest.fixture
def client(engine):
    app = create_app(Settings(database_url="sqlite://", cors_origins=[]), engine=engine)
    with TestClient(app) as c:
        yield c


def employee_payload(**overrides) -> dict:
    """A valid employee; override only what a test cares about."""
    base = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": f"ada.{overrides.get('last_name', 'lovelace').lower()}@acme.example",
        "job_title": "Software Engineer",
        "department": "Engineering",
        "country_code": "US",
        "employment_type": "full_time",
        "salary": 120_000,
        "hire_date": "2022-03-01",
    }
    base.update(overrides)
    return base


@pytest.fixture
def make_employee(db):
    counter = {"n": 0}

    def _make(**overrides):
        counter["n"] += 1
        overrides.setdefault("email", f"person{counter['n']}@acme.example")
        return employee_service.create_employee(db, EmployeeCreate(**employee_payload(**overrides)))

    return _make


TODAY = date(2026, 1, 15)
