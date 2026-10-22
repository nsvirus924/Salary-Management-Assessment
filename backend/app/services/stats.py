"""Pure statistics helpers. No database, no I/O: easy to reason about and test.

SQLite has no PERCENTILE_CONT, so medians/percentiles are computed in Python.
At 10k rows that is a few milliseconds (see docs/performance.md).
"""
from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class Summary:
    count: int
    min: int
    max: int
    mean: int
    median: int
    p25: int
    p75: int


@dataclass(frozen=True)
class Bucket:
    lower: int
    upper: int
    count: int


def percentile(sorted_values: Sequence[float], p: float) -> float:
    """Linear-interpolated percentile (same method as numpy's default). p in [0, 100]."""
    if not sorted_values:
        raise ValueError("percentile of empty sequence")
    if not 0 <= p <= 100:
        raise ValueError("p must be between 0 and 100")
    rank = (len(sorted_values) - 1) * p / 100
    lo, hi = math.floor(rank), math.ceil(rank)
    if lo == hi:
        return float(sorted_values[lo])
    return sorted_values[lo] + (sorted_values[hi] - sorted_values[lo]) * (rank - lo)


def summarize(values: Sequence[float]) -> Summary:
    """Summary statistics, rounded to whole currency units."""
    if not values:
        raise ValueError("cannot summarize empty sequence")
    ordered = sorted(values)
    return Summary(
        count=len(ordered),
        min=round(ordered[0]),
        max=round(ordered[-1]),
        mean=round(sum(ordered) / len(ordered)),
        median=round(percentile(ordered, 50)),
        p25=round(percentile(ordered, 25)),
        p75=round(percentile(ordered, 75)),
    )


def percentile_rank(values: Sequence[float], x: float) -> float:
    """Share of values below x, counting ties as half, in percent (0-100)."""
    if not values:
        raise ValueError("percentile_rank of empty sequence")
    below = sum(1 for v in values if v < x)
    equal = sum(1 for v in values if v == x)
    return round(100 * (below + 0.5 * equal) / len(values), 1)


def histogram(values: Sequence[float], bins: int = 10) -> list[Bucket]:
    """Equal-width buckets from min to max. The last bucket includes its upper bound."""
    if bins < 1:
        raise ValueError("bins must be >= 1")
    if not values:
        return []
    lo, hi = min(values), max(values)
    if lo == hi:
        return [Bucket(lower=round(lo), upper=round(hi), count=len(values))]
    width = (hi - lo) / bins
    counts = [0] * bins
    for v in values:
        counts[min(int((v - lo) / width), bins - 1)] += 1
    return [
        Bucket(lower=round(lo + i * width), upper=round(lo + (i + 1) * width), count=c)
        for i, c in enumerate(counts)
    ]
