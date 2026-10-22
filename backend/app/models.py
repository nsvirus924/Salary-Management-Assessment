"""ORM models.

Salaries are stored as whole units of the employee's *local* currency (the currency
of their country). Annual salaries do not need cents, and integers avoid float drift.
"""
from __future__ import annotations

import enum
from datetime import date, datetime, timezone

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EmploymentType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACTOR = "contractor"


class Country(Base):
    """Reference data: a country, its payroll currency and a static USD rate for comparisons."""

    __tablename__ = "countries"

    code: Mapped[str] = mapped_column(String(2), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    currency: Mapped[str] = mapped_column(String(3))
    # 1 unit of local currency == usd_rate USD. Used for analytics only.
    usd_rate: Mapped[float]


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (
        CheckConstraint("salary > 0", name="ck_employees_salary_positive"),
        Index("ix_employees_country_title", "country_code", "job_title"),
        Index("ix_employees_country_department", "country_code", "department"),
        Index("ix_employees_name", "last_name", "first_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_code: Mapped[str] = mapped_column(String(20), unique=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    job_title: Mapped[str] = mapped_column(String(100), index=True)
    department: Mapped[str] = mapped_column(String(100), index=True)
    country_code: Mapped[str] = mapped_column(ForeignKey("countries.code"), index=True)
    employment_type: Mapped[str] = mapped_column(String(20), default=EmploymentType.FULL_TIME.value)
    salary: Mapped[int] = mapped_column(Integer)
    hire_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    country: Mapped[Country] = relationship()
    salary_changes: Mapped[list[SalaryChange]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="SalaryChange.id.desc()",
    )

    @property
    def currency(self) -> str:
        return self.country.currency

    @property
    def salary_usd(self) -> int:
        return round(self.salary * self.country.usd_rate)


class SalaryChange(Base):
    """Append-only audit trail of salary changes, including the initial salary."""

    __tablename__ = "salary_changes"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True
    )
    previous_salary: Mapped[int | None] = mapped_column(Integer, nullable=True)
    new_salary: Mapped[int] = mapped_column(Integer)
    effective_date: Mapped[date] = mapped_column(Date)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    employee: Mapped[Employee] = relationship(back_populates="salary_changes")
