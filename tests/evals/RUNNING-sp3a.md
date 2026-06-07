# SP3a marker-emission evals (assisted)

These extend the SP2 eval procedure (tests/evals/RUNNING.md) for the two new
marker scenarios. For each: assemble the advisor context (brain SKILL.md + the
scenario), have a fresh actor respond, then an independent judge checks `expect`
and `mustNot`. The new check: the actor's output contains a SINGLE-LINE valid
`<!--advisor-event:{...}-->` marker of the right `type`, and never `skill_invoked`.

Merge gate: these 2 + the 8 SP2 scenarios all PASS (recorded in the PR).
