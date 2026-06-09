# Installing aiSkillAdvisor

aiSkillAdvisor installs **inside Claude Code** — no terminal needed. Install it once
at "user" scope and it's active in **every** project automatically. Nothing is written
into your project repos.

> Requirement: Node.js must be installed (the advisor's hooks run on Node).

## Install with no terminal (recommended)

In any Claude Code session (VS Code extension or desktop app):

1. Run `/plugin`.
2. Open the **Marketplaces** tab → **Add marketplace** → paste:
   `AmRaghuAkula/aiSkillAdvisor`
3. Open the **Discover** tab → find **ai-skill-advisor** → **Install**.
4. Choose **User** scope (so it's on in every project).
5. Run `/reload-plugins`.

That's it. You'll see skill suggestions as you work, and `/skill-value` shows what the
advisor has done for you.

## Install from the terminal (optional, for CLI users)

```bash
claude plugin marketplace add AmRaghuAkula/aiSkillAdvisor
claude plugin install ai-skill-advisor@ai-skill-advisor --scope user
```

## Verify it loaded

- `/plugin list` → `ai-skill-advisor` shows as enabled
- `/hooks` → shows aiSkillAdvisor's hooks
- `/skill-value` → prints a (possibly empty) value report

## Update

Re-run the install (or `claude plugin update ai-skill-advisor@ai-skill-advisor`) to get
the latest version, then `/reload-plugins`.
