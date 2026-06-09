---
name: skill-value
description: Show the aiSkillAdvisor value report — suggestions made, accepted/declined, and near-misses caught. Pass session (default), today, or week.
disable-model-invocation: true
---

# /skill-value

Run the report CLI and show its output verbatim to the user. The argument is the
window: `session` (default), `today`, or `week`.

To run it, use the absolute CLI path that aiSkillAdvisor injected into the SessionStart
context (the line: `To run the value report (the /skill-value command), execute with
Node: node "<path>".`). Run that exact command with the window appended, e.g.
`node "<path>" $ARGUMENTS`.

If that line is not present, fall back to:
`node "${CLAUDE_PLUGIN_ROOT}/dist/report/cli.js" $ARGUMENTS`.

Then present the output as-is. Do not editorialize or invent numbers — the CLI is the
source of truth.
