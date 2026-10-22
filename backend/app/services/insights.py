"""Answers to "how does the org pay people?".

Rule: within one country we report in local currency (exact, what payroll pays).
Across countries we convert to USD with the static rate (comparable, approximate).
"""
from __future__ import annotations

from collections import defaultdict
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import InvalidInputError
from app.models import Country, Employee
from app.schemas import (Breakdown, CountryStats, Distribution, GroupStats, Overview,
                         PeerComparison, SalaryStats)
from app.services import employees as employee_service
from app.services.stats import histogram, percentile_rank, summarize

GroupBy = Literal["job_title", "department"]


def _stats(values: list[float]) -> SalaryStats:
    return SalaryStats.model_validate(summarize(values))


def _country(db: Session, code: str) -> Country:
    country = db.get(Country, code)
    if country is None:
        raise InvalidInputError(f"Unknown country '{code}'")
    return country


def overview(db: Session) -> Overview:
    rows = db.execute(
        select(Employee.country_code, Employee.department, Employee.salary,
               Country.name, Country.currency, Country.usd_rate)
        .join(Country, Employee.country_code == Country.code)
    ).all()

    by_country: dict[str, list] = defaultdict(list)
    departments = set()
    for row in rows:
        by_country[row.country_code].append(row)
        departments.add(row.department)

    country_stats = []
    for code, group in by_country.items():
        first = group[0]
        local = [r.salary for r in group]
        usd = [r.salary * first.usd_rate for r in group]
        local_stats = _stats(local)
        country_stats.append(CountryStats(
            country_code=code, country_name=first.name, currency=first.currency,
            headcount=len(group), local=local_stats,
            median_usd=round(local_stats.median * first.usd_rate),
            payroll_usd=round(sum(usd)),
        ))
    country_stats.sort(key=lambda c: c.headcount, reverse=True)

    all_usd = [r.salary * r.usd_rate for r in rows]
    return Overview(
        headcount=len(rows),
        country_count=len(by_country),
        department_count=len(departments),
        total_payroll_usd=round(sum(all_usd)),
        salary_usd=_stats(all_usd) if all_usd else None,
        by_country=country_stats,
    )


def _salaries(db: Session, country_code: str | None, *extra_columns):
    """Rows of (salary, *extra) in local currency for one country, or USD for all."""
    if country_code:
        country = _country(db, country_code)
        rows = db.execute(select(Employee.salary, *extra_columns)
                          .where(Employee.country_code == country_code)).all()
        return country.currency, [(float(r[0]), *r[1:]) for r in rows]
    rows = db.execute(select(Employee.salary * Country.usd_rate, *extra_columns)
                      .join(Country, Employee.country_code == Country.code)).all()
    return "USD", [(float(r[0]), *r[1:]) for r in rows]


def breakdown(db: Session, group_by: GroupBy, country_code: str | None = None) -> Breakdown:
    column = Employee.job_title if group_by == "job_title" else Employee.department
    currency, rows = _salaries(db, country_code, column)

    groups: dict[str, list[float]] = defaultdict(list)
    for salary, name in rows:
        groups[name].append(salary)

    result = [GroupStats(name=name, headcount=len(vals), stats=_stats(vals))
              for name, vals in groups.items()]
    result.sort(key=lambda g: g.stats.median, reverse=True)
    return Breakdown(group_by=group_by, country_code=country_code, currency=currency, groups=result)


def distribution(db: Session, country_code: str | None = None, bins: int = 12) -> Distribution:
    currency, rows = _salaries(db, country_code)
    return Distribution(country_code=country_code, currency=currency,
                        buckets=histogram([r[0] for r in rows], bins))


def peer_comparison(db: Session, employee_id: int) -> PeerComparison:
    employee = employee_service.get_employee(db, employee_id)
    peers = list(db.scalars(
        select(Employee.salary).where(
            Employee.country_code == employee.country_code,
            Employee.job_title == employee.job_title,
            # Part-time salaries are not comparable with full-time ones.
            Employee.employment_type == employee.employment_type,
            Employee.id != employee.id,
        )
    ))
    if not peers:
        return PeerComparison(peer_count=0, currency=employee.currency, stats=None,
                              percentile_rank=None, position="no_peers")

    stats = _stats(peers)
    if employee.salary < stats.p25:
        position = "below_p25"
    elif employee.salary > stats.p75:
        position = "above_p75"
    else:
        position = "p25_to_p75"
    return PeerComparison(peer_count=len(peers), currency=employee.currency, stats=stats,
                          percentile_rank=percentile_rank(peers, employee.salary),
                          position=position)
