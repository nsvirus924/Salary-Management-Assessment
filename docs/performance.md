# Performance

## Measured on the seeded 10,000-employee database

Each figure is the median of 5 requests against a local uvicorn server with SQLite in WAL mode.

| Endpoint | Median |
|---|---|
| `GET /api/employees?page_size=25` | 3.5 ms |
| `GET /api/employees?q=priya engineer` (multi-word search) | 23.1 ms |
| `GET /api/employees?country=IN&sort=salary&order=desc` | 3.9 ms |
| `GET /api/employees?page=400` (deep page) | 7.8 ms |
| `GET /api/insights/overview` | 65.0 ms |
| `GET /api/insights/breakdown?group_by=job_title` (org-wide, USD) | 54.8 ms |
| `GET /api/insights/breakdown?group_by=job_title&country=IN` | 7.2 ms |
| `GET /api/insights/distribution` | 19.6 ms |
| `GET /api/employees/42/peer-comparison` | 2.8 ms |

Seeding 10,000 employees plus their initial salary history takes about **0.5 s**, using batched Core `insert()` with 2,000 rows per batch.

Every endpoint is well under the 300 ms target in `requirements.md`.

## Indexes and query plans

| Query | Plan |
|---|---|
| Peer lookup (`country_code`, `job_title`) | `SEARCH USING INDEX ix_employees_country_title` |
| Count by country | `SEARCH USING COVERING INDEX ix_employees_country_code` |
| Default sort by name | `SCAN USING COVERING INDEX ix_employees_name` (no sort step) |

The composite indexes `(country_code, job_title)` and `(country_code, department)` match the most common question: what do we pay role X in country Y?

## Where time goes, and what would change at larger scale

- **Search (`ILIKE '%term%'`)** cannot use a B-tree index, so it scans about 10k rows, roughly 20 ms. At 100k+ rows, use SQLite FTS5 or Postgres `pg_trgm`.
- **Org-wide insights** load every salary and compute percentiles in Python, at about 60 ms for 10k rows. At larger scale:
  1. Use Postgres `percentile_cont` and `GROUP BY` so only aggregates leave the database.
  2. Cache insights for a short time; the data changes only when HR edits it.
- **Deep pagination** uses `OFFSET`. This is fine at 400 pages; at millions of rows, switch to keyset (cursor) pagination on `(last_name, first_name, id)`.
- **Frontend:** search is debounced (300 ms), pages keep previous data while loading (no flicker), and charts load only on the insights page.
