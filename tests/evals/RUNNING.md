# Running the SP2 scenario evals (assisted gate)

GitHub CI has no AI, so these run locally/assisted before merge. The deterministic
half (context assembly) is unit-tested in CI via `assemble.test.ts`. This procedure
covers the judgment half.

For EACH scenario in `scenarios.json`:
1. Build the assembled context: it equals `assembleAdvisorContext(scenario)`.
2. Dispatch a fresh subagent prompted as: "You are a Claude Code session. Your
   advisor instructions are the contents of `skills/advisor/SKILL.md` (paste them).
   The following context was injected. Respond as you normally would to the USER
   PROMPT." — then paste the assembled context.
3. Dispatch a second, independent judge subagent: give it the scenario's `expect`
   (and `mustNot` if present) and the first subagent's response. Ask: "Does the
   response satisfy `expect` and avoid `mustNot`? PASS/FAIL + one-line reason."
4. Record PASS/FAIL per scenario in the PR description.

Merge gate: ALL scenarios PASS (and CI green). A FAIL is a RED — fix the brain
skill prose and re-run (RED/GREEN).

## Validation-gap note
These single-turn scenarios validate matching + the security guards (SEC-1/SEC-2)
+ a CASE-E multi-type case + a tripwire. They do NOT validate STATEFUL rules —
"never repeat a declined suggestion", sunset, and L1-L5 invocation budgets need
MULTI-TURN evals (not built here). L1-L5 get code-hardened in SP3; the
don't-repeat/sunset rules ship as instructions and get multi-turn evals later.
This gap is intentional and tracked.
