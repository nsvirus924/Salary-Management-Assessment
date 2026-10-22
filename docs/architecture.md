# Architecture

## Overview

```mermaid
flowchart LR
    HR[HR Manager<br/>browser] -->|HTTPS| UI

    subgraph Container["Single container (Docker)"]
        UI[React SPA<br/>static files] 
        API[FastAPI<br/>/api/*]
        subgraph Backend
            R[Routers<br/>HTTP + validation] --> S[Services<br/>business rules]
            S --> ST[stats.py<br/>pure functions]
            S --> ORM[SQLAlchemy models]
        end
        API --- R
        ORM --> DB[(SQLite<br/>/data volume)]
    end

    UI -->|fetch JSON| API
    Seed[seed script] -->|bulk insert| DB
```

One process serves both the API and the built React app. There is one deployable unit, there is no CORS in production, and it is cheap to host.

## Backend layers

| Layer | Files | Responsibility | Knows about HTTP? |
|---|---|---|---|
| Routers | `app/api/*.py` | Parse query/body, call a service, shape the response | Yes |
| Schemas | `app/schemas.py` | Shape validation (types, lengths, ranges, email) | No |
| Services | `app/services/employees.py`, `insights.py` | Business rules: uniqueness, salary history, the currency-change guard, peer selection | No |
| Stats | `app/services/stats.py` | Percentiles, summary, histogram, percentile rank | No (pure) |
| Models | `app/models.py` | Tables, constraints, indexes | No |

Services raise domain errors (`NotFoundError`, `ConflictError`, `InvalidInputError`). One handler in `app/main.py` maps them to 404/409/422, so no service imports FastAPI.

`create_app(settings, engine)` is a factory. Tests pass an in-memory engine, and the app never touches a real file at import time.

## Data model

```mermaid
erDiagram
    COUNTRIES ||--o{ EMPLOYEES : "pays in"
    EMPLOYEES ||--o{ SALARY_CHANGES : "has"
    COUNTRIES {
        string code PK "ISO-2"
        string name
        string currency "ISO-4217"
        float usd_rate "analytics only"
    }
    EMPLOYEES {
        int id PK
        string employee_code UK
        string email UK
        string first_name
        string last_name
        string job_title
        string department
        string country_code FK
        string employment_type
        int salary "annual, local currency"
        date hire_date
    }
    SALARY_CHANGES {
        int id PK
        int employee_id FK "cascade delete"
        int previous_salary "null for initial"
        int new_salary
        date effective_date
        string reason
    }
```

Currency is derived from country rather than stored per employee, so the two can never disagree.

## Frontend

```
src/
  api/        client.ts (fetch + error mapping), hooks.ts (TanStack Query), types.ts
  lib/        pure, unit-tested logic: format, validation, payband maths
  components/ PayBand, EmployeeFormDialog, EmployeeDetailDrawer, ConfirmDialog
  pages/      EmployeesPage, InsightsPage (lazy-loaded)
```

- **Server state** lives in TanStack Query. Every write invalidates the employee, insights and meta queries, so the numbers on every screen stay consistent after an edit.
- **Logic lives outside components.** Validation, change-diffing and band maths are plain functions with tests, and components stay thin.
- **The edit form sends only changed fields.** A save without a salary change therefore never creates a history entry.

## Request flow: a salary change

```mermaid
sequenceDiagram
    participant UI as Edit form
    participant API as PATCH /api/employees/42
    participant S as employee service
    participant DB as SQLite
    UI->>UI: validate, diff against original
    UI->>API: {salary: 108000, salary_change_reason: "Promotion"}
    API->>S: update_employee(42, data)
    S->>DB: load employee + country
    S->>S: currency-change guard, email uniqueness
    S->>DB: append salary_changes row, update employee (one transaction)
    API-->>UI: 200 updated employee
    UI->>UI: invalidate employees / insights / meta
```
