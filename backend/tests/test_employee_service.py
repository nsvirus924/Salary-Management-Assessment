import pytest

from app.errors import ConflictError, InvalidInputError, NotFoundError
from app.schemas import EmployeeCreate, EmployeeUpdate
from app.services import employees as svc
from app.services.employees import EmployeeFilters
from tests.conftest import TODAY, employee_payload


class TestCreate:
    def test_creates_employee_with_generated_code_and_local_currency(self, make_employee):
        emp = make_employee(country_code="IN", salary=2_400_000)
        assert emp.employee_code == "E000001"
        assert emp.currency == "INR"
        assert emp.salary_usd == round(2_400_000 * 0.012)

    def test_records_initial_salary_in_history(self, db, make_employee):
        emp = make_employee(salary=90_000)
        [change] = svc.salary_history(db, emp.id)
        assert change.previous_salary is None
        assert change.new_salary == 90_000
        assert change.reason == "Initial salary"

    def test_rejects_unknown_country(self, db):
        with pytest.raises(InvalidInputError, match="Unknown country"):
            svc.create_employee(db, EmployeeCreate(**employee_payload(country_code="ZZ")))

    def test_rejects_duplicate_email_case_insensitively(self, make_employee):
        make_employee(email="sam@acme.example")
        with pytest.raises(ConflictError, match="email"):
            make_employee(email="SAM@acme.example")

    def test_rejects_duplicate_employee_code(self, make_employee):
        make_employee(employee_code="HR-1")
        with pytest.raises(ConflictError, match="employee code"):
            make_employee(employee_code="HR-1")


class TestUpdate:
    def test_salary_change_is_recorded_with_reason(self, db, make_employee):
        emp = make_employee(salary=100_000)
        svc.update_employee(db, emp.id, EmployeeUpdate(salary=110_000,
                            salary_change_reason="Annual review"), today=TODAY)
        latest = svc.salary_history(db, emp.id)[0]
        assert (latest.previous_salary, latest.new_salary) == (100_000, 110_000)
        assert latest.reason == "Annual review"
        assert latest.effective_date == TODAY

    def test_non_salary_edit_does_not_add_history(self, db, make_employee):
        emp = make_employee()
        svc.update_employee(db, emp.id, EmployeeUpdate(job_title="Senior Software Engineer"))
        assert len(svc.salary_history(db, emp.id)) == 1

    def test_same_salary_does_not_add_history(self, db, make_employee):
        emp = make_employee(salary=100_000)
        svc.update_employee(db, emp.id, EmployeeUpdate(salary=100_000))
        assert len(svc.salary_history(db, emp.id)) == 1

    def test_moving_to_other_currency_requires_new_salary(self, db, make_employee):
        emp = make_employee(country_code="US", salary=100_000)
        with pytest.raises(InvalidInputError, match="restated"):
            svc.update_employee(db, emp.id, EmployeeUpdate(country_code="IN"))

    def test_moving_within_same_currency_keeps_salary(self, db, make_employee):
        emp = make_employee(country_code="DE", salary=80_000)
        updated = svc.update_employee(db, emp.id, EmployeeUpdate(country_code="FR"))
        assert (updated.country_code, updated.currency, updated.salary) == ("FR", "EUR", 80_000)

    def test_moving_with_new_salary_updates_currency(self, db, make_employee):
        emp = make_employee(country_code="US", salary=100_000)
        updated = svc.update_employee(db, emp.id, EmployeeUpdate(country_code="GB", salary=75_000))
        assert updated.currency == "GBP"

    def test_rejects_email_taken_by_someone_else(self, db, make_employee):
        make_employee(email="a@acme.example")
        b = make_employee(email="b@acme.example")
        with pytest.raises(ConflictError):
            svc.update_employee(db, b.id, EmployeeUpdate(email="a@acme.example"))

    def test_missing_employee_raises_not_found(self, db):
        with pytest.raises(NotFoundError):
            svc.update_employee(db, 999, EmployeeUpdate(salary=1))


class TestDelete:
    def test_delete_removes_employee_and_history(self, db, make_employee):
        emp = make_employee()
        svc.delete_employee(db, emp.id)
        with pytest.raises(NotFoundError):
            svc.get_employee(db, emp.id)


class TestList:
    @pytest.fixture
    def staff(self, make_employee):
        make_employee(first_name="Priya", last_name="Sharma", country_code="IN",
                      salary=3_000_000, job_title="Data Analyst", department="Finance")
        make_employee(first_name="John", last_name="Smith", country_code="US", salary=150_000)
        make_employee(first_name="Hans", last_name="Becker", country_code="DE", salary=70_000,
                      employment_type="contractor")

    def test_search_matches_all_words_across_fields(self, db, staff):
        items, total = svc.list_employees(db, EmployeeFilters(q="priya analyst"))
        assert total == 1 and items[0].first_name == "Priya"

    def test_filters_combine(self, db, staff):
        items, total = svc.list_employees(
            db, EmployeeFilters(country_code="DE", employment_type="contractor"))
        assert total == 1 and items[0].last_name == "Becker"

    def test_salary_sort_uses_usd_equivalent(self, db, staff):
        # INR 3,000,000 ~ USD 36k; EUR 70k ~ USD 75.6k; USD 150k.
        items, _ = svc.list_employees(db, sort="salary", order="desc")
        assert [e.country_code for e in items] == ["US", "DE", "IN"]

    def test_pagination_returns_total_and_slice(self, db, staff):
        items, total = svc.list_employees(db, sort="name", page=2, page_size=2)
        assert total == 3
        assert [e.last_name for e in items] == ["Smith"]

    def test_rejects_unknown_sort(self, db):
        with pytest.raises(InvalidInputError):
            svc.list_employees(db, sort="password")
