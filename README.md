# aiSkillAdvisor

> **The right skill, at the right moment — without being a senior engineer.**
> An always-on advisor for Claude Code that watches what you're doing and suggests the installed skill that fits, flags risky moves before you make them, and quietly tracks the value it adds. Built for non-technical builders. Free for non-commercial use.

[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm--NC--1.0.0-blue.svg)](LICENSE)
[![Privacy: local-first, no telemetry](https://img.shields.io/badge/privacy-local--first%20%C2%B7%20no%20telemetry-2ea44f.svg)](#privacy)

> 🔒 **Privacy promise.** aiSkillAdvisor is local-first and sends **nothing, anywhere** — no telemetry, no analytics, no phone-home. The source contains no network code at all; the only thing it writes is a local log on your own machine. Don't take my word for it — there isn't a single `fetch` or `http` call in the repo. [More below ↓](#privacy)

---

## The problem

Claude Code (and the wider AI-agent ecosystem) now ships with **100+ specialized skills** — for security review, QA, design, deployment, planning, testing, and more. Each one is genuinely useful **if you know it exists and remember to use it at the right moment.**

That "if" is the whole problem. It's a **discovery problem**, and it hits non-technical builders hardest:

- You don't run a security review before merging a billing change — you didn't know there was a skill for it.
- You push a UI change without QA — nobody reminded you.
- You ask for "make it feel more premium" and never reach for the design skill that would nail it.

The skills are there. The knowing-when is not. **aiSkillAdvisor is the layer that knows when.**

---

## What it does

Once installed, aiSkillAdvisor rides along in every Claude Code session and:

- 🔎 **Sees what's installed.** On each session it sweeps every skill you have (across all your plugins) — no manual setup. (It found **139** in a typical environment.)
- 💡 **Suggests the right skill, one at a time.** When your request clearly matches a skill, it surfaces a single plain-language nudge: *"Skill suggestion: `cso` — a security review before this billing change. Want me to run it?"*
- 🛑 **Flags risky moments.** About to push straight to production, merge without review, or do something destructive? It raises a risk flag **before** it happens.
- 🧮 **Tracks its own value.** A local log records suggestions made, accepted, declined — and especially **near-misses caught** (risky actions it flagged). Run `/skill-value` any time to see it.
- 🎚️ **Tunes to your project.** Run `/advisor-tune` and it reads only what *you* approve (this project's `CLAUDE.md`, README, structure), figures out what the project is about, and leans its suggestions accordingly — a soft lean that never hides a fitting skill.
- 🤫 **Stays quiet when nothing fits.** It defaults to silence. No nagging, no stacking suggestions, and it never re-suggests something you declined.

It runs **on the AI already in your session** — no API key, no extra cost, and **nothing ever leaves your machine.**

---

## Who it's for

The **non-technical builder** — indie founders, product managers, designers, solo entrepreneurs: people with strong product instincts but limited engineering background, shipping real things with AI help.

It's just as useful for technical builders who want **systematic skill discipline** instead of relying on memory and judgment alone.

---

## Install (no terminal needed)

aiSkillAdvisor installs **inside Claude Code**. Install once at "user" scope and it's active in **every** project — and it writes nothing into your repos.

> Requirement: Node.js installed (the advisor's hooks run on Node).

1. Run `/plugin`
2. **Marketplaces** tab → **Add marketplace** → paste `AmRaghuAkula/aiSkillAdvisor`
3. **Discover** (or **Plugins**) tab → find **ai-skill-advisor** → **Install**
4. Choose **User** scope
5. Run `/reload-plugins`

Prefer the terminal?

```bash
claude plugin marketplace add AmRaghuAkula/aiSkillAdvisor
claude plugin install ai-skill-advisor@ai-skill-advisor --scope user
```

Full walkthrough + how to verify: [`INSTALL.md`](INSTALL.md).

---

## What it looks like

```
You:  I'm about to push the billing webhook change straight to production.

aiSkillAdvisor:
  ⚠️ Risk flag: about to deploy a billing change with no review.
     `cso` would security-review it first. Recommend running it before you push.
```

```
You:  /skill-value

aiSkillAdvisor — value report (this session)
  Suggestions made:        4   (accepted 2 · declined 1)
  ⭐ Near-misses caught:    1
     • billing change about to merge with no security review
```

---

## Under the hood

aiSkillAdvisor is a Claude Code plugin made of four lightweight hooks, a "brain" skill, and a local value log. It adds **no model cost** — the hooks just inject context, and the in-session AI does the thinking.

```
  ┌─────────────────────────────────────────────────────────────┐
  │  YOUR CLAUDE CODE SESSION                                     │
  │                                                               │
  │  SessionStart ──▶ sweep installed skills (all plugins +       │
  │                   ~/.claude/skills) → inject the inventory    │
  │                   + the advisor brain + the report path       │
  │                                                               │
  │  UserPromptSubmit ──▶ per message: "does an installed skill   │
  │                       fit this request?" (default: silence)   │
  │                                                               │
  │     the BRAIN (advisor skill) decides → suggests / risk-flags │
  │            │                                                  │
  │            ▼                                                  │
  │  PreToolUse(Skill) ──▶ logs every skill actually run          │
  │  Stop ──────────────▶ records suggestions + near-misses       │
  │            │                                                  │
  │            ▼                                                  │
  │     local value log  ($CLAUDE_PLUGIN_DATA, never leaves)      │
  │            │                                                  │
  │            ▼                                                  │
  │     /skill-value ──▶ plain-language report                    │
  └─────────────────────────────────────────────────────────────┘
```

**Safety is built in:**

- **Untrusted inventory (SEC-1).** Skill descriptions are treated as data, never instructions — a malicious skill description can't hijack the advisor.
- **No silent auto-run (SEC-2).** Only a small, hardcoded allowlist of read-only skills may auto-run. Anything that changes state always asks you first.
- **Loop-prevention (L1–L5).** Guards against the AI cascading "fix A → break B → fix B → break C" until your original goal is lost.
- **Local-first.** The value log stays on your machine. No telemetry, no phone-home.

---

## Features

| Capability | Status |
|---|---|
| Auto-discovers all installed skills each session | ✅ |
| Proactive, one-at-a-time skill suggestions | ✅ |
| Risk flags before destructive / unreviewed actions | ✅ |
| Work-type classification (data, security, AI, design, growth, …) | ✅ |
| Value log + `/skill-value` report (incl. near-misses caught) | ✅ |
| Untrusted-data + auto-run-allowlist security guards | ✅ |
| Loop-prevention: L2 budget + L5 cycle enforced in code (L1/L3/L4 as guidance) | ✅ |
| No-terminal install via marketplace + prebuilt code | ✅ |
| Per-project tuning — `/advisor-tune` infers your project's focus (consent-gated) | ✅ |
| Browser control panel | ⏳ planned |
| Auto-install skills you don't have yet | ⏳ planned |

---

## What it is *not*

- ❌ Not a new AI model or a paid service — it rides the Claude you already have.
- ❌ Not a data collector — nothing leaves your machine.
- ❌ Not an autopilot — it suggests; you decide. State-changing skills always ask first.
- ❌ Not a nag — it stays silent unless something genuinely fits, and respects "stop suggesting."

---

## FAQ

**Does this cost anything or need an API key?**
No. It uses the AI already running in your Claude Code session. No key, no added bill.

**Does it send my code or prompts anywhere?**
No. The only thing it writes is a local value log on your own machine.

**Will it run skills without asking?**
Only read-only, safe skills on a fixed allowlist may auto-run. Anything that changes things always asks first.

**Do I need to configure which skills I have?**
No — it discovers them automatically every session.

**Can I tune it for a specific project?**
Yes — run `/advisor-tune`. It reads only the sources you approve, infers what the project is about, confirms with you, and then leans its suggestions toward what matters here (a soft lean — it never hides a fitting skill). 100% local.

**Which tools does it support?**
Claude Code today. Other agents (Cursor, etc.) are a possible future direction.

**How do I see what it's done for me?**
Run `/skill-value` for a plain-language report (this session / today / this week).

---

## Limitations (honest)

- It only knows the skills you actually have installed — it can't yet fetch ones you're missing (that's on the roadmap).
- Suggestion quality depends on the in-session model reading the context well; it errs toward silence, so it will sometimes stay quiet when a skill could have helped.
- Near-miss and suggestion tracking rely on the model emitting an internal marker; the deterministic skill-run log is exact, the semantic events are best-effort.
- Built and tested primarily on Windows + Claude Code; broader environments are lightly exercised so far.

---

## Roadmap

- ✅ Walking skeleton, installed-skill inventory, the advising brain
- ✅ Value & near-miss log + `/skill-value`
- ✅ No-terminal install (marketplace + prebuilt code)
- ✅ Loop-prevention rails (L2 budget / L5 cycle) enforced in code + multi-turn eval
- ✅ Smart onboarding + per-project tuning (`/advisor-tune`)
- ⏳ Browser control panel (see & tune the advisor visually)
- ⏳ Find & one-tap-install trusted skills you don't have yet

See [`CHANGELOG.md`](CHANGELOG.md) for the full release history.

---

## Privacy

aiSkillAdvisor is **local-first by design** and makes **zero network calls.**

- **No telemetry, no analytics, no phone-home.** It never reports usage, installs, or anything else back to anyone — including the author. Install it, and no one (me included) can see that you did.
- **Nothing leaves your machine.** Your prompts, your code, and the value log all stay on your computer. The log lives under your local Claude data directory.
- **Verifiable, not just promised.** The entire source imports only Node's local file/path modules — there is no HTTP client, socket, or analytics SDK anywhere in the codebase. Search the repo for `fetch` or `http`; you won't find a call.

*(Because the project is hosted on public GitHub, GitHub itself shows the repo owner anonymous, aggregate traffic stats — clones and views. That's a standard GitHub feature for any public repo, it's not user-identifiable, and it's nothing the plugin does.)*

---

## License

**PolyForm Noncommercial 1.0.0** — see [LICENSE](LICENSE) and the plain-English [LICENSING.md](LICENSING.md).

- ✅ **Free** for personal, educational, research, hobbyist, and non-profit use — no payment, no agreement.
- 🤝 **Commercial use needs a separate agreement** — open a GitHub Issue and tag `@AmRaghuAkula` to start.
- 📜 A lawyer-drafted fair-source license (PolyForm, by Heather Meeker), not a hand-rolled one.

---

## Maintainer

Built by [@AmRaghuAkula](https://github.com/AmRaghuAkula), to help non-technical AI enthusiasts get more out of the AI coding ecosystem — because the right skill at the right moment shouldn't require being a senior engineer.
