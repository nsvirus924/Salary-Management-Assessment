import pytest

from app.errors import InvalidInputError, NotFoundError
from app.services import insights


@pytest.fixture
def org(make_employee):
    """Small org: 3 US engineers, 2 Indian engineers, 1 US recruiter."""
    for salary in (100_000, 120_000, 140_000):
        make_employee(country_code="US", salary=salary)
    for salary in (2_000_000, 3_000_000):
        make_employee(country_code="IN", salary=salary)
    make_employee(country_code="US", salary=80_000, job_title="Recruiter", department="HR")


class TestOverview:
    def test_headcount_and_payroll_in_usd(self, db, org):
        result = insights.overview(db)
        assert result.headcount == 6
        assert result.country_count == 2
        assert result.department_count == 2
        # 440k USD + 5M INR * 0.012 = 440k + 60k
        assert result.total_payroll_usd == 500_000

    def test_country_stats_are_in_local_currency(self, db, org):
        india = next(c for c in insights.overview(db).by_country if c.country_code == "IN")
        assert india.currency == "INR"
        assert india.local.median == 2_500_000
        assert india.median_usd == 30_000

    def test_empty_org(self, db):
        result = insights.overview(db)
        assert result.headcount == 0 and result.salary_usd is None and result.by_country == []


class TestBreakdown:
    def test_by_title_within_country_uses_local_currency(self, db, org):
        result = insights.breakdown(db, "job_title", "US")
        assert result.currency == "USD"
        by_name = {g.name: g for g in result.groups}
        assert by_name["Software Engineer"].stats.median == 120_000
        assert by_name["Recruiter"].headcount == 1

    def test_org_wide_converts_to_usd(self, db, org):
        result = insights.breakdown(db, "job_title")
        engineers = next(g for g in result.groups if g.name == "Software Engineer")
        assert engineers.headcount == 5
        assert engineers.stats.min == 24_000  # 2M INR

    def test_groups_sorted_by_median_desc(self, db, org):
        medians = [g.stats.median for g in insights.breakdown(db, "department", "US").groups]
        assert medians == sorted(medians, reverse=True)

    def test_unknown_country(self, db):
        with pytest.raises(InvalidInputError):
            insights.breakdown(db, "job_title", "ZZ")


def test_distribution_counts_all_employees(db, org):
    result = insights.distribution(db, "US", bins=4)
    assert sum(b.count for b in result.buckets) == 4


class TestPeerComparison:
    def test_position_within_peers(self, db, make_employee):
        for salary in (90_000, 100_000, 110_000, 120_000):
            make_employee(salary=salary)
        low = make_employee(salary=60_000)
        result = insights.peer_comparison(db, low.id)
        assert result.peer_count == 4
        assert result.position == "below_p25"
        assert result.percentile_rank == 0

    def test_peers_share_title_country_and_employment_type(self, db, make_employee):
        make_employee(salary=100_000, country_code="CA")
        make_employee(salary=100_000, job_title="Recruiter")
        make_employee(salary=50_000, employment_type="part_time")
        alone = make_employee(salary=100_000)
        result = insights.peer_comparison(db, alone.id)
        assert result.position == "no_peers" and result.stats is None

    def test_missing_employee(self, db):
        with pytest.raises(NotFoundError):
            insights.peer_comparison(db, 42)
