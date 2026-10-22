from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import Breakdown, Distribution, Overview, PeerComparison
from app.services import insights as svc

router = APIRouter(tags=["insights"])
DB = Annotated[Session, Depends(get_db)]
CountryParam = Annotated[str | None, Query(pattern=r"^[A-Z]{2}$")]


@router.get("/insights/overview", response_model=Overview)
def overview(db: DB):
    return svc.overview(db)


@router.get("/insights/breakdown", response_model=Breakdown)
def breakdown(db: DB, group_by: Literal["job_title", "department"] = "job_title",
              country: CountryParam = None):
    return svc.breakdown(db, group_by, country)


@router.get("/insights/distribution", response_model=Distribution)
def distribution(db: DB, country: CountryParam = None,
                 bins: Annotated[int, Query(ge=1, le=50)] = 12):
    return svc.distribution(db, country, bins)


@router.get("/employees/{employee_id}/peer-comparison", response_model=PeerComparison)
def peer_comparison(db: DB, employee_id: int):
    return svc.peer_comparison(db, employee_id)
