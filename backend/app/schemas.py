"""Request/response models. Validation of shape lives here; business rules live in services."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import EmploymentType

MAX_SALARY = 1_000_000_000  # generous: covers JPY/INR annual salaries

Name = Field(min_length=1, max_length=100)


class _Strip(BaseModel):
    @field_validator("*", mode="before")
    @classmethod
    def _strip_strings(cls, v):
        return v.strip() if isinstance(v, str) else v


class EmployeeCreate(_Strip):
    employee_code: str | None = Field(default=None, max_length=20, pattern=r"^[A-Za-z0-9-]+$")
    first_name: str = Name
    last_name: str = Name
    email: EmailStr
    job_title: str = Name
    department: str = Name
    country_code: str = Field(pattern=r"^[A-Z]{2}$")
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    salary: int = Field(gt=0, le=MAX_SALARY)
    hire_date: date


class EmployeeUpdate(_Strip):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    job_title: str | None = Field(default=None, min_length=1, max_length=100)
    department: str | None = Field(default=None, min_length=1, max_length=100)
    country_code: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    employment_type: EmploymentType | None = None
    salary: int | None = Field(default=None, gt=0, le=MAX_SALARY)
    hire_date: date | None = None
    salary_change_reason: str | None = Field(default=None, max_length=255)


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    first_name: str
    last_name: str
    email: str
    job_title: str
    department: str
    country_code: str
    currency: str
    employment_type: EmploymentType
    salary: int
    salary_usd: int
    hire_date: date
    created_at: datetime
    updated_at: datetime


class EmployeePage(BaseModel):
    items: list[EmployeeOut]
    total: int
    page: int
    page_size: int


class SalaryChangeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    previous_salary: int | None
    new_salary: int
    effective_date: date
    reason: str | None
    created_at: datetime


# ---- Insights -------------------------------------------------------------

class SalaryStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    count: int
    min: int
    max: int
    mean: int
    median: int
    p25: int
    p75: int


class CountryStats(BaseModel):
    country_code: str
    country_name: str
    currency: str
    headcount: int
    local: SalaryStats
    median_usd: int
    payroll_usd: int


class Overview(BaseModel):
    headcount: int
    country_count: int
    department_count: int
    total_payroll_usd: int
    salary_usd: SalaryStats | None
    by_country: list[CountryStats]


class GroupStats(BaseModel):
    name: str
    headcount: int
    stats: SalaryStats


class Breakdown(BaseModel):
    group_by: str
    country_code: str | None
    currency: str
    groups: list[GroupStats]


class BucketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lower: int
    upper: int
    count: int


class Distribution(BaseModel):
    country_code: str | None
    currency: str
    buckets: list[BucketOut]


class PeerComparison(BaseModel):
    """How one employee's salary compares to others with the same title in the same country."""

    peer_count: int
    currency: str
    stats: SalaryStats | None
    percentile_rank: float | None
    position: str  # below_p25 | p25_to_p75 | above_p75 | no_peers
