import pytest

from app.services.stats import Bucket, histogram, percentile, percentile_rank, summarize


class TestPercentile:
    def test_interpolates_between_values(self):
        assert percentile([10, 20, 30, 40], 50) == 25

    def test_endpoints_are_min_and_max(self):
        assert percentile([3, 7, 9], 0) == 3
        assert percentile([3, 7, 9], 100) == 9

    def test_single_value(self):
        assert percentile([42], 75) == 42

    @pytest.mark.parametrize("bad", [[], None])
    def test_empty_raises(self, bad):
        with pytest.raises((ValueError, TypeError)):
            percentile(bad, 50)

    def test_out_of_range_p_raises(self):
        with pytest.raises(ValueError):
            percentile([1, 2], 101)


class TestSummarize:
    def test_summary_of_known_values(self):
        s = summarize([50_000, 60_000, 70_000, 80_000, 1_000_000])
        assert (s.count, s.min, s.max) == (5, 50_000, 1_000_000)
        assert s.median == 70_000
        assert s.mean == 252_000  # mean is pulled by the outlier; median is not
        assert (s.p25, s.p75) == (60_000, 80_000)

    def test_unsorted_input(self):
        assert summarize([3, 1, 2]).median == 2

    def test_empty_raises(self):
        with pytest.raises(ValueError):
            summarize([])


class TestPercentileRank:
    def test_lowest_highest_and_middle(self):
        values = [10, 20, 30, 40]
        assert percentile_rank(values, 5) == 0
        assert percentile_rank(values, 50) == 100
        assert percentile_rank(values, 25) == 50

    def test_ties_count_half(self):
        assert percentile_rank([10, 10, 10, 10], 10) == 50


class TestHistogram:
    def test_counts_every_value_once(self):
        buckets = histogram([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], bins=5)
        assert len(buckets) == 5
        assert sum(b.count for b in buckets) == 11
        assert buckets[0] == Bucket(lower=0, upper=2, count=2)
        assert buckets[-1].count == 3  # max value lands in last bucket

    def test_identical_values_make_one_bucket(self):
        assert histogram([5, 5, 5], bins=4) == [Bucket(5, 5, 3)]

    def test_empty_input(self):
        assert histogram([], bins=3) == []

    def test_invalid_bins(self):
        with pytest.raises(ValueError):
            histogram([1, 2], bins=0)
