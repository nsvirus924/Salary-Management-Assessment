# How AI was used

This project was built with an agentic AI assistant (Claude) working in a sandboxed Linux environment. The assistant could write files, run tests, run the app, take browser screenshots, and make git commits. The human set the goal and constraints and reviewed the output.

## Working agreement given to the AI

> Build this incrementally. Write the requirements document before any code. Each step should be one commit with tests passing. Keep business rules out of HTTP handlers and logic out of React components so both can be unit tested. Prefer simple, explainable choices over clever ones, and write down every trade-off.

## Prompts used, by phase

| Phase | Prompt (paraphrased) | What the human checked |
|---|---|---|
| Requirements | "Write a one-page requirements doc for an HR manager managing salaries for 10k employees across countries. Include what is deliberately out of scope and why." | Scope was realistic; multi-currency handled honestly, not hand-waved |
| Stack | "Pick a backend and frontend stack and justify it in two lines each." | Fits the brief: React UI, relational DB |
| Data model | "Design the schema. How should salaries in different currencies be stored?" | Local currency plus a reference rate; integers for money |
| Services | "Implement the employee service with validation. What business rules would an HR manager expect?" | The currency-change guard came out of this question |
| Tests | "Write fast, deterministic tests for every rule. One behaviour per test, named for the behaviour." | In-memory DB, fixed seeds, no network, about 1 s total |
| Insights | "What questions does an HR manager actually ask about pay? Build endpoints for them." | Peer comparison was added as the question asked at raise time |
| Seed | "Generate 10k realistic employees deterministically. Salaries should vary by role and country." | Spot-checked medians by country and role |
| UI | "Build the directory and insights pages. Keep logic in tested helpers." | Visual review through screenshots |
| Review | "Screenshot each page with seeded data and critique it." | Led to the fix commit below |

## Where the AI got it wrong, and how it was caught

Recording these is the point: AI output was treated as a draft, not as truth.

1. **Peer comparison mixed part-time and full-time pay.**
   - All unit tests passed. The bug only showed when looking at the detail drawer on seeded data: a full-time Support Team Lead was compared with part-timers on half pay.
   - **Fixed** by matching on employment type, with a test for it.
2. **Pay bands in tables were each on their own scale.**
   - Every row looked identical, so the chart conveyed nothing. This was caught in screenshot review.
   - **Fixed** with a shared scale per table; country rows are drawn in USD.
3. **A meaningless test assertion.**
   - A generated test for path traversal ended in `... or True`, so it could never fail.
   - Caught in review and replaced with a real assertion.
4. **Environment slips.**
   - A shell command relied on brace expansion that the shell did not support, so the frontend source files were never written.
   - A blanket warning filter would have hidden our own deprecations; it was narrowed to the third-party packages only.

## Guardrails that made AI output trustworthy

- **Tests ran after every change.** Nothing was committed red.
- **Pure functions** (`stats.py`, `lib/*.ts`) let correctness be checked with small, known inputs.
- **Visual review on real data.** Two of the four bugs above were invisible to unit tests.
- **Measurement over claims.** `performance.md` uses timings and query plans that were actually run, not estimates.
