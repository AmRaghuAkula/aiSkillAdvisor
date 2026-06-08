---
name: skill-value
description: Show the aiSkillAdvisor value report — suggestions made, accepted/declined, and near-misses caught. Pass session (default), today, or week.
disable-model-invocation: true
---

# /skill-value

Run the report CLI and show its output verbatim to the user. The argument is the
window: `session` (default), `today`, or `week`.

Run: `node "${CLAUDE_PLUGIN_ROOT}/dist/report/cli.js" $ARGUMENTS`

Then present the output as-is. Do not editorialize or invent numbers — the CLI is
the source of truth. (If `${CLAUDE_PLUGIN_ROOT}` does not resolve to a path, locate
the aiSkillAdvisor plugin's `dist/report/cli.js` under the loaded plugins directory
and run that instead.)
