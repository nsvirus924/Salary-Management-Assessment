from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Country, Employee, EmploymentType

router = APIRouter(tags=["meta"])


class CountryOut(BaseModel):
    code: str
    name: str
    currency: str
    usd_rate: float


class MetaOut(BaseModel):
    countries: list[CountryOut]
    departments: list[str]
    job_titles: list[str]
    employment_types: list[EmploymentType]


@router.get("/meta", response_model=MetaOut)
def meta(db: Annotated[Session, Depends(get_db)]):
    """Options for filters and form dropdowns."""
    countries = db.scalars(select(Country).order_by(Country.name)).all()
    departments = db.scalars(select(Employee.department).distinct().order_by(Employee.department)).all()
    titles = db.scalars(select(Employee.job_title).distinct().order_by(Employee.job_title)).all()
    return MetaOut(
        countries=[CountryOut.model_validate(c, from_attributes=True) for c in countries],
        departments=list(departments),
        job_titles=list(titles),
        employment_types=list(EmploymentType),
    )
