"""Deterministic generation of realistic employee records (no database access).

Salary = base USD for the role x country market factor x individual noise,
converted to local currency and rounded the way payroll figures usually are.
"""
from __future__ import annotations

import random
import unicodedata
from datetime import date, timedelta
from pathlib import Path

from app.reference_data import COUNTRIES

SEED_DIR = Path(__file__).resolve().parent
REFERENCE_DATE = date(2026, 1, 1)  # fixed so output does not depend on "today"

# department -> [(job title, US base salary in USD)]
JOBS: dict[str, list[tuple[str, int]]] = {
    "Engineering": [("Software Engineer", 125_000), ("Senior Software Engineer", 165_000),
                    ("Staff Engineer", 210_000), ("Engineering Manager", 195_000),
                    ("QA Engineer", 95_000), ("DevOps Engineer", 135_000)],
    "Product": [("Product Manager", 145_000), ("Senior Product Manager", 180_000)],
    "Design": [("Product Designer", 115_000), ("Senior Product Designer", 145_000)],
    "Data": [("Data Analyst", 90_000), ("Data Scientist", 140_000)],
    "Sales": [("Sales Development Rep", 60_000), ("Account Executive", 95_000),
              ("Sales Manager", 140_000)],
    "Marketing": [("Marketing Specialist", 70_000), ("Marketing Manager", 115_000)],
    "Finance": [("Accountant", 75_000), ("Financial Analyst", 85_000),
                ("Finance Manager", 130_000)],
    "People": [("Recruiter", 75_000), ("HR Generalist", 70_000), ("HR Manager", 110_000)],
    "Customer Support": [("Support Specialist", 50_000), ("Support Team Lead", 70_000)],
    "Operations": [("Operations Analyst", 72_000), ("Office Manager", 60_000)],
}
DEPARTMENT_WEIGHTS = {"Engineering": 30, "Product": 5, "Design": 4, "Data": 6, "Sales": 15,
                      "Marketing": 7, "Finance": 6, "People": 5, "Customer Support": 14,
                      "Operations": 8}

# Pay level relative to the US, in USD terms, and share of headcount.
COUNTRY_FACTOR = {"US": 1.0, "GB": 0.72, "DE": 0.75, "FR": 0.65, "IN": 0.28, "CA": 0.78,
                  "AU": 0.8, "SG": 0.75, "BR": 0.32, "JP": 0.6}
COUNTRY_WEIGHTS = {"US": 28, "IN": 22, "GB": 10, "DE": 8, "FR": 5, "CA": 7, "AU": 5,
                   "SG": 4, "BR": 6, "JP": 5}

EMPLOYMENT_TYPES = [("full_time", 88), ("part_time", 5), ("contractor", 7)]


def load_names(filename: str) -> list[str]:
    return [line.strip() for line in (SEED_DIR / filename).read_text(encoding="utf-8").splitlines()
            if line.strip()]


def _ascii(text: str) -> str:
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()


def _round_salary(amount: float, usd_rate: float) -> int:
    """Round to 1,000 for low-value currencies (INR, JPY), otherwise to 100."""
    step = 1_000 if usd_rate < 0.05 else 100
    return max(step, int(round(amount / step) * step))


def generate_employees(count: int, seed: int = 42,
                       first_names: list[str] | None = None,
                       last_names: list[str] | None = None) -> list[dict]:
    rng = random.Random(seed)
    first_names = first_names or load_names("first_names.txt")
    last_names = last_names or load_names("last_names.txt")
    rates = {c["code"]: c["usd_rate"] for c in COUNTRIES}
    countries, country_w = zip(*COUNTRY_WEIGHTS.items())
    departments, dept_w = zip(*DEPARTMENT_WEIGHTS.items())
    types, type_w = zip(*EMPLOYMENT_TYPES)

    employees = []
    for i in range(1, count + 1):
        country = rng.choices(countries, country_w)[0]
        department = rng.choices(departments, dept_w)[0]
        title, base_usd = rng.choice(JOBS[department])
        employment_type = rng.choices(types, type_w)[0]
        first, last = rng.choice(first_names), rng.choice(last_names)

        usd = base_usd * COUNTRY_FACTOR[country] * rng.uniform(0.82, 1.18)
        if employment_type == "part_time":
            usd *= 0.55
        local = _round_salary(usd / rates[country], rates[country])

        employees.append({
            "employee_code": f"E{i:06d}",
            "first_name": first,
            "last_name": last,
            "email": f"{_ascii(first)}.{_ascii(last)}.{i}@acme.example",
            "job_title": title,
            "department": department,
            "country_code": country,
            "employment_type": employment_type,
            "salary": local,
            "hire_date": REFERENCE_DATE - timedelta(days=rng.randint(30, 15 * 365)),
        })
    return employees
