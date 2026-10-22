# Requirements: ACME Salary Manager

## Goal
ACME's HR team keeps salary data for ~10,000 employees across several countries in spreadsheets. Edits are error-prone, there is no change history, and answering a simple question ("what do we pay a Senior Software Engineer in India?") means filtering and pivoting by hand. The goal is a web app where the **HR Manager** can maintain salary records and answer common pay questions in seconds.

**Success looks like:** an HR Manager can find any employee in under 5 seconds, change a salary with a recorded reason, and answer "what do we pay role X in country Y?" without exporting anything.

## Users
One persona: the HR Manager. They are comfortable with Excel, not with databases. They care about accuracy, auditability of changes, and comparing pay fairly across roles and countries.

## In scope
1. **Employee directory**: server-side search (name, email, code, title), filter (country, department, employment type), sort, and pagination over 10k rows.
2. **Create / edit / delete employees**, with validation (required fields, valid email, positive salary, known country, unique email/code).
3. **Salary history**: every salary change is recorded with old value, new value, effective date and reason. HR asked for "who changed what" more than anything else.
4. **Multi-currency done honestly**: salaries are stored in the employee's local currency (that is what payroll pays). A country reference table carries the currency and a USD rate, used *only* for cross-country comparison, never to overwrite stored data.
5. **Pay insights**:
   - Org overview: headcount, annual payroll (USD), median salary (USD), and a per-country table (headcount, median, P25–P75 in local currency).
   - Breakdown by job title or department, for one country (local currency) or the whole org (USD).
   - Salary distribution histogram.
   - **Peer comparison** on each employee: where their pay sits against peers with the same title in the same country (P25/median/P75 and percentile rank). This is the question HR actually asks when reviewing a raise.
6. **Seed script** that generates 10,000 realistic, deterministic employees.

## Deliberately out of scope (and why)
| Left out | Reason |
|---|---|
| Authentication / roles | Single persona, single org. Real deployments would sit behind company SSO; building a login screen adds little signal here. Noted as the first production gap. |
| Payroll, tax, payslips | A different product with legal complexity per country. This tool is the source of truth for *compensation data*, not payment. |
| Bonus, equity, benefits | Base salary answers most of the stated questions. The data model can grow a `compensation_components` table later. |
| Excel/CSV import | Valuable for migration, but robust import (mapping, partial failures, dedupe) is a project in itself. The seed script proves bulk loading; import is the top follow-up. |
| Live FX rates | Rates change daily; analytics need stable, explainable numbers. Static, visible rates are a deliberate choice. |
| Gender / demographic pay-gap analysis | Requires collecting sensitive personal data with legal basis per country. Out of scope until that is agreed. |
| Soft delete / termination workflow | Hard delete with confirmation keeps scope small; a `status` + `termination_date` is the natural next step. |
| Approval workflows, notifications, multi-tenant | Not needed by one HR Manager in one org. |

## Non-functional
- List and insight endpoints respond in < 300 ms on 10k employees with SQLite.
- Fast, deterministic tests (in-memory DB, fixed seeds, no network).
- One-command local start; single container for deployment.
