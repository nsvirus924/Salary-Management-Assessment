"""Employee use cases: listing, CRUD and salary history.

Functions take a Session and plain inputs so they are easy to test without HTTP.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, contains_eager, joinedload

from app.errors import ConflictError, InvalidInputError, NotFoundError
from app.models import Country, Employee, SalaryChange
from app.schemas import EmployeeCreate, EmployeeUpdate

# Salary sorts by USD equivalent: ordering raw numbers across currencies
# (e.g. JPY next to USD) would be meaningless to an HR manager.
SORT_COLUMNS = {
    "name": (Employee.last_name, Employee.first_name),
    "employee_code": (Employee.employee_code,),
    "job_title": (Employee.job_title,),
    "department": (Employee.department,),
    "country": (Employee.country_code,),
    "salary": (Employee.salary * Country.usd_rate,),
    "hire_date": (Employee.hire_date,),
}


@dataclass(frozen=True)
class EmployeeFilters:
    q: str | None = None
    country_code: str | None = None
    department: str | None = None
    job_title: str | None = None
    employment_type: str | None = None


def _conditions(filters: EmployeeFilters) -> list:
    conditions = []
    if filters.q:
        # Every word must match some searchable field: "priya eng" finds Priya, Engineer.
        for token in filters.q.split():
            pattern = f"%{token}%"
            conditions.append(
                or_(
                    Employee.first_name.ilike(pattern),
                    Employee.last_name.ilike(pattern),
                    Employee.email.ilike(pattern),
                    Employee.employee_code.ilike(pattern),
                    Employee.job_title.ilike(pattern),
                )
            )
    if filters.country_code:
        conditions.append(Employee.country_code == filters.country_code)
    if filters.department:
        conditions.append(Employee.department == filters.department)
    if filters.job_title:
        conditions.append(Employee.job_title == filters.job_title)
    if filters.employment_type:
        conditions.append(Employee.employment_type == filters.employment_type)
    return conditions


def list_employees(
    db: Session,
    filters: EmployeeFilters = EmployeeFilters(),
    sort: str = "name",
    order: str = "asc",
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[Employee], int]:
    if sort not in SORT_COLUMNS:
        raise InvalidInputError(f"Cannot sort by '{sort}'. Use one of: {', '.join(SORT_COLUMNS)}")
    conditions = _conditions(filters)

    total = db.scalar(select(func.count(Employee.id)).where(*conditions)) or 0

    columns = SORT_COLUMNS[sort]
    ordering = [c.desc() if order == "desc" else c.asc() for c in columns]
    stmt: Select = (
        select(Employee)
        .join(Employee.country)
        .options(contains_eager(Employee.country))
        .where(*conditions)
        .order_by(*ordering, Employee.id)  # id tiebreak keeps pages stable
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(db.scalars(stmt).unique()), total


def get_employee(db: Session, employee_id: int) -> Employee:
    employee = db.get(Employee, employee_id, options=[joinedload(Employee.country)])
    if employee is None:
        raise NotFoundError(f"Employee {employee_id} not found")
    return employee


def _require_country(db: Session, code: str) -> Country:
    country = db.get(Country, code)
    if country is None:
        raise InvalidInputError(f"Unknown country '{code}'")
    return country


def _ensure_unique(db: Session, *, email: str | None = None, code: str | None = None,
                   exclude_id: int | None = None) -> None:
    for column, value, label in ((Employee.email, email, "email"),
                                 (Employee.employee_code, code, "employee code")):
        if value is None:
            continue
        stmt = select(Employee.id).where(func.lower(column) == value.lower())
        if exclude_id is not None:
            stmt = stmt.where(Employee.id != exclude_id)
        if db.scalar(stmt) is not None:
            raise ConflictError(f"An employee with this {label} already exists")


def _next_employee_code(db: Session) -> str:
    max_id = db.scalar(select(func.max(Employee.id))) or 0
    return f"E{max_id + 1:06d}"


def create_employee(db: Session, data: EmployeeCreate) -> Employee:
    _require_country(db, data.country_code)
    code = data.employee_code or _next_employee_code(db)
    _ensure_unique(db, email=data.email, code=code)

    fields = data.model_dump(exclude={"employee_code"})
    fields["employment_type"] = data.employment_type.value
    employee = Employee(employee_code=code, **fields)
    employee.salary_changes.append(
        SalaryChange(previous_salary=None, new_salary=data.salary,
                     effective_date=data.hire_date, reason="Initial salary")
    )
    db.add(employee)
    db.commit()
    return get_employee(db, employee.id)


def update_employee(db: Session, employee_id: int, data: EmployeeUpdate,
                    today: date | None = None) -> Employee:
    employee = get_employee(db, employee_id)
    changes = data.model_dump(exclude_unset=True, exclude={"salary_change_reason"})
    changes = {k: v for k, v in changes.items() if v is not None}

    new_country = changes.get("country_code")
    if new_country and new_country != employee.country_code:
        country = _require_country(db, new_country)
        # Moving someone to a different currency without restating salary would silently
        # reinterpret e.g. 90,000 USD as 90,000 INR.
        if country.currency != employee.currency and "salary" not in changes:
            raise InvalidInputError(
                "Salary must be restated when moving an employee to a country with a "
                f"different currency ({employee.currency} to {country.currency})"
            )
    if "email" in changes:
        _ensure_unique(db, email=changes["email"], exclude_id=employee.id)
    if "employment_type" in changes:
        changes["employment_type"] = changes["employment_type"].value

    new_salary = changes.get("salary")
    if new_salary is not None and new_salary != employee.salary:
        employee.salary_changes.append(
            SalaryChange(previous_salary=employee.salary, new_salary=new_salary,
                         effective_date=today or date.today(),
                         reason=data.salary_change_reason or None)
        )

    for key, value in changes.items():
        setattr(employee, key, value)
    db.commit()
    db.expire(employee, ["country"])
    return get_employee(db, employee.id)


def delete_employee(db: Session, employee_id: int) -> None:
    employee = get_employee(db, employee_id)
    db.delete(employee)
    db.commit()


def salary_history(db: Session, employee_id: int) -> list[SalaryChange]:
    get_employee(db, employee_id)
    stmt = (select(SalaryChange).where(SalaryChange.employee_id == employee_id)
            .order_by(SalaryChange.id.desc()))
    return list(db.scalars(stmt))
