"""Seed the database.

    python -m seed.seed                 # 10,000 employees, replaces existing data
    python -m seed.seed --if-empty      # only seed when there are no employees (deploys)
    python -m seed.seed --count 500 --seed 7
"""
from __future__ import annotations

import argparse
import time

from sqlalchemy import delete, func, insert, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import Base, make_engine
from app.models import Employee, SalaryChange
from app.reference_data import ensure_countries
from seed.generator import generate_employees

BATCH_SIZE = 2_000


def seed_database(session: Session, count: int = 10_000, seed: int = 42) -> int:
    """Replace all employees with `count` generated ones. Returns rows inserted."""
    ensure_countries(session)
    session.execute(delete(SalaryChange))
    session.execute(delete(Employee))

    rows = generate_employees(count, seed)
    for start in range(0, len(rows), BATCH_SIZE):
        session.execute(insert(Employee), rows[start:start + BATCH_SIZE])

    # Every employee gets an "initial salary" entry, as if created through the app.
    initial = session.execute(select(Employee.id, Employee.salary, Employee.hire_date)).all()
    history = [{"employee_id": r.id, "previous_salary": None, "new_salary": r.salary,
                "effective_date": r.hire_date, "reason": "Initial salary"} for r in initial]
    for start in range(0, len(history), BATCH_SIZE):
        session.execute(insert(SalaryChange), history[start:start + BATCH_SIZE])

    session.commit()
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--count", type=int, default=10_000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--if-empty", action="store_true", help="skip if employees exist")
    args = parser.parse_args()

    engine = make_engine(get_settings().database_url)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        if args.if_empty and session.scalar(select(func.count(Employee.id))):
            print("Employees already present; skipping seed.")
            return
        started = time.perf_counter()
        inserted = seed_database(session, args.count, args.seed)
        print(f"Seeded {inserted:,} employees in {time.perf_counter() - started:.2f}s")


if __name__ == "__main__":
    main()
