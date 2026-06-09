# Running the SP3b multi-turn evals (assisted)

The deterministic rails (L2 budget, L5 cycle) are covered by unit/integration tests
(`tests/events/budget.test.ts`, `tests/run-pre-tool-use.int.test.ts`). The only
stateful brain behavior that needs a model in the loop is **decline-then-no-repeat**.

1. Build: `npm run build`.
2. In a Node REPL or scratch script, import `assembleMultiTurn` from
   `tests/evals/assemble.ts` and pass the `decline-then-no-repeat` scenario from
   `scenarios.json` to print the assembled multi-turn context.
3. Paste that context into a fresh Claude session (or read it as the advisor).
4. PASS if Turn 1 suggests `cso` and Turn 2 does NOT re-suggest it, and no marker rule
   is violated.

Record the result (pass/fail + notes) in the PR description, same as SP2/SP3a evals.
