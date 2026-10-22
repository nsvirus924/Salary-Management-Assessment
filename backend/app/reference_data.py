"""Countries ACME operates in. Rates are indicative, fixed on purpose (see docs/decisions.md)."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Country

COUNTRIES: list[dict] = [
    {"code": "US", "name": "United States", "currency": "USD", "usd_rate": 1.0},
    {"code": "GB", "name": "United Kingdom", "currency": "GBP", "usd_rate": 1.27},
    {"code": "DE", "name": "Germany", "currency": "EUR", "usd_rate": 1.08},
    {"code": "FR", "name": "France", "currency": "EUR", "usd_rate": 1.08},
    {"code": "IN", "name": "India", "currency": "INR", "usd_rate": 0.012},
    {"code": "CA", "name": "Canada", "currency": "CAD", "usd_rate": 0.73},
    {"code": "AU", "name": "Australia", "currency": "AUD", "usd_rate": 0.66},
    {"code": "SG", "name": "Singapore", "currency": "SGD", "usd_rate": 0.74},
    {"code": "BR", "name": "Brazil", "currency": "BRL", "usd_rate": 0.18},
    {"code": "JP", "name": "Japan", "currency": "JPY", "usd_rate": 0.0067},
]


def ensure_countries(session: Session) -> None:
    """Insert any missing reference countries. Idempotent; never overwrites edits."""
    existing = {code for (code,) in session.query(Country.code).all()}
    session.add_all(Country(**c) for c in COUNTRIES if c["code"] not in existing)
    session.commit()
