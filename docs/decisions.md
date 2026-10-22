# Design decisions and trade-offs

Each entry gives the decision, the alternatives considered, and why this choice was made at this scale.

## 1. Store salary in local currency, convert only for analytics
- **Chosen:** `employees.salary` holds whole units of the country's currency. `countries.usd_rate` is used only to compare across countries.
- **Rejected:** storing everything in USD, which loses the number payroll actually pays and drifts whenever rates change. Storing both values would need syncing and could disagree.
- **Consequence:** within a country, insights are exact. Across countries they are approximate, and the UI says so on every screen.

## 2. Static exchange rates
- **Chosen:** fixed reference rates seeded with the countries.
- **Rejected:** a live FX API, which would add a network dependency and make yesterday's report differ from today's for no HR reason.
- **Next step:** an editable rates table with an "as of" date.

## 3. Integer salaries
Annual salaries do not need cents, and integers avoid floating-point drift. Averages are rounded to whole units in the API.

## 4. Salary history as an append-only table
Every create and every salary change writes a `salary_changes` row in the same transaction. HR's biggest pain with spreadsheets was not knowing who changed what. The history table answers the *what* and *when*; *who* arrives with authentication.

## 5. Guard: changing country to a different currency requires restating salary
Without this guard, moving someone from the US to India would silently turn 90,000 USD into 90,000 INR. The service rejects that change, and the form explains it before the user submits. Moves within one currency (DE to FR) keep the salary.

## 6. Salary sort uses the USD equivalent
Sorting raw numbers would put a ¥9M salary above a $200k one. Sorting by `salary * usd_rate` gives the order an HR manager expects.

## 7. Peers are defined as same title, country and employment type
This was found by inspecting real seeded data. Including part-timers dragged full-time peer bands down and mislabelled people as "above range". The fix is in its own commit.

## 8. Percentiles computed in Python, not SQL
SQLite has no `PERCENTILE_CONT`. At 10k rows, computing in Python takes milliseconds and keeps the maths in pure, unit-tested functions. With Postgres and over a million rows, the next step would be to push this into SQL; see `performance.md`.

## 9. SQLite
- **Why:** zero operations, a single file on a volume, and more than fast enough for one HR team and 10k rows.
- **Limits:** a single writer, and no horizontal scaling.
- **Moving off it:** SQLAlchemy keeps Postgres a `DATABASE_URL` change; the only SQLite-specific code is the pragma block in `db.py`.

## 10. `create_all` instead of Alembic migrations
This is acceptable for a first release with no existing data. Before the second schema change, Alembic should be added.

## 11. Server-side pagination, search and filtering
Sending 10k rows to the browser would work today but would not scale, and it would make search slower on weak laptops. The server returns 25 to 100 rows per page and a total count.

## 12. Single container serving API and UI
One deploy, one URL, no CORS, and no separate static host. The trade-off is that the UI and API cannot be scaled separately, which does not matter here.

## 13. Hard delete with confirmation
Keeps scope small. A real HR system would mark people as terminated instead; this is listed as out of scope in the requirements.

## 14. No authentication (deliberate gap)
There is a single persona, and the time went into the core workflows instead. **This must be added before real salary data goes in:** SSO (OIDC) in front of the app, then a `changed_by` column on `salary_changes`.

## 15. Library choices
- **MUI:** accessible tables, dialogs and selects without building them.
- **TanStack Query:** caching, refetching, and invalidation after writes.
- **Recharts:** one histogram did not justify a heavier charting library.
- The insights route is lazy-loaded, so the charting code does not slow the first load of the directory.
