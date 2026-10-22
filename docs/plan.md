# Build plan

Working order, each step a commit, each step leaving tests green.

1. Requirements (this folder) before code.
2. Backend skeleton: FastAPI app factory, settings, SQLite engine, health check.
3. Domain model: `countries`, `employees`, `salary_changes`; employee service with validation; unit tests.
4. Employee REST API: list (search/filter/sort/paginate), CRUD, salary history; API tests.
5. Stats module (pure functions: percentiles, histogram, percentile rank) with unit tests.
6. Insights service + API (overview, breakdown, distribution, peer comparison).
7. Seed script: deterministic 10k generator + bulk insert; tests on the generator.
8. Frontend: Vite + React + TS + MUI. API client, employees page, form, detail drawer.
9. Insights page with charts.
10. Single-container deployment (backend serves built UI), Render config.
11. Docs: architecture, decisions, performance, AI usage, demo script.

## Stack choice
- **Backend: Python + FastAPI + SQLAlchemy 2 + SQLite.** Typed request/response models (Pydantic), auto OpenAPI docs, and a very fast test loop. SQLite is enough for 10k rows and one writer; SQLAlchemy keeps a Postgres move a config change.
- **Frontend: React + Vite + TypeScript + MUI + TanStack Query + Recharts.** MUI gives accessible tables/dialogs quickly; TanStack Query handles caching and invalidation after edits so we do not hand-roll it.
