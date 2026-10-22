from collections import Counter

from sqlalchemy import func, select

from app.models import Employee, SalaryChange
from app.reference_data import COUNTRIES
from seed.generator import JOBS, generate_employees
from seed.seed import seed_database


def test_generator_is_deterministic():
    assert generate_employees(50, seed=1) == generate_employees(50, seed=1)
    assert generate_employees(50, seed=1) != generate_employees(50, seed=2)


def test_generated_records_are_valid_and_unique():
    rows = generate_employees(2_000, seed=3)
    valid_countries = {c["code"] for c in COUNTRIES}
    valid_titles = {t for jobs in JOBS.values() for t, _ in jobs}

    assert len({r["email"] for r in rows}) == len(rows)
    assert len({r["employee_code"] for r in rows}) == len(rows)
    assert all(r["salary"] > 0 for r in rows)
    assert {r["country_code"] for r in rows} <= valid_countries
    assert {r["job_title"] for r in rows} <= valid_titles
    assert all("@" in r["email"] and r["email"].isascii() for r in rows)


def test_salaries_are_realistic_per_market():
    rows = generate_employees(3_000, seed=4)
    us = [r["salary"] for r in rows if r["country_code"] == "US" and r["employment_type"] == "full_time"]
    india = [r["salary"] for r in rows if r["country_code"] == "IN" and r["employment_type"] == "full_time"]
    assert 30_000 < min(us) and max(us) < 300_000
    assert 500_000 < min(india) and all(s % 1_000 == 0 for s in india)


def test_distribution_spans_countries_and_departments():
    rows = generate_employees(1_000, seed=5)
    assert len(Counter(r["country_code"] for r in rows)) == len(COUNTRIES)
    assert len(Counter(r["department"] for r in rows)) == len(JOBS)


def test_seed_database_replaces_data_and_writes_history(db, make_employee):
    make_employee()
    inserted = seed_database(db, count=300, seed=6)
    assert inserted == 300
    assert db.scalar(select(func.count(Employee.id))) == 300
    assert db.scalar(select(func.count(SalaryChange.id))) == 300
