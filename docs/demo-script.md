# Demo video script (about 4 minutes)

Record with Loom, OBS, or QuickTime against the deployed app or `make docker`.

1. **The problem (20 s).** "ACME's HR team manages pay for 10,000 people in 10 countries in spreadsheets. This app replaces that."

2. **Directory (45 s).**
   - Show "10,000 people".
   - Type `priya engineer`: multi-word search across name and title.
   - Filter Country = India, then sort by salary. Point out that rupees are shown with a USD equivalent underneath.
   - Clear filters.

3. **Employee detail (45 s).**
   - Open a row.
   - Point at the pay band: "Where does this person sit against full-time peers with the same title in the same country?"
   - Show the salary history.

4. **Give a raise (45 s).**
   - Click Edit and change the salary.
   - Note that the reason field appears only when the salary changes. Enter "Annual review" and save.
   - The history shows the new entry with its percentage change.
   - Try changing the country to India without changing the salary. The form blocks it: "Restate the salary in INR".

5. **Pay insights (60 s).**
   - Read the headline figures.
   - In the country table, note that the bands are drawn in USD on one scale, so India and Brazil visibly sit lower.
   - Click India: the breakdown switches to INR.
   - Toggle to Department.
   - Show the distribution chart.

6. **Engineering (30 s).**
   - Show `git log --oneline` and `docs/`.
   - Run `make test`: 87 tests in a few seconds.
   - Mention the fix commit that came from reviewing real data.
