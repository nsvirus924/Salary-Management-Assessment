from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import EmploymentType
from app.schemas import EmployeeCreate, EmployeeOut, EmployeePage, EmployeeUpdate, SalaryChangeOut
from app.services import employees as svc

router = APIRouter(prefix="/employees", tags=["employees"])
DB = Annotated[Session, Depends(get_db)]
SortField = Literal["name", "employee_code", "job_title", "department", "country", "salary", "hire_date"]


@router.get("", response_model=EmployeePage)
def list_employees(
    db: DB,
    q: Annotated[str | None, Query(max_length=100)] = None,
    country: Annotated[str | None, Query(pattern=r"^[A-Z]{2}$")] = None,
    department: str | None = None,
    job_title: str | None = None,
    employment_type: EmploymentType | None = None,
    sort: SortField = "name",
    order: Literal["asc", "desc"] = "asc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
):
    filters = svc.EmployeeFilters(
        q=q, country_code=country, department=department, job_title=job_title,
        employment_type=employment_type.value if employment_type else None,
    )
    items, total = svc.list_employees(db, filters, sort, order, page, page_size)
    return EmployeePage(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(db: DB, data: EmployeeCreate):
    return svc.create_employee(db, data)


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(db: DB, employee_id: int):
    return svc.get_employee(db, employee_id)


@router.patch("/{employee_id}", response_model=EmployeeOut)
def update_employee(db: DB, employee_id: int, data: EmployeeUpdate):
    return svc.update_employee(db, employee_id, data)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(db: DB, employee_id: int):
    svc.delete_employee(db, employee_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{employee_id}/salary-history", response_model=list[SalaryChangeOut])
def salary_history(db: DB, employee_id: int):
    return svc.salary_history(db, employee_id)
