# aiSkillAdvisor

> Helping non-technical AI enthusiasts get the best out of the skills available to their AI agents — by your side, understanding your context, and advising which skill to invoke for each task.

This repo is aimed at helping non-tech AI enthusiasts to get best out of the skills. **aiSkillAdvisor** is designed to work by your side understanding your context and advise the skills needed to invoke to get the best out of each skill for respective tasks. This is also configurable to add more skills and it can auto-sweep to add available skills.

---

## Why this exists

The AI coding agent ecosystem (Claude Code, Cursor, Continue, Aider, etc.) now ships with **180+ specialized skills** across plugin namespaces:

- **gstack** — ~40 skills for shipping, testing, design, security
- **vercel** — ~25 skills for deployment, AI SDK, Next.js, storage
- **superpowers** — ~13 skills for TDD, planning, verification
- **claude-md-management**, **postman**, **hf-skills**, and many more

Each skill is well-documented **if you know to look for it**.

The problem: **the discovery problem**. Finding the right skill at the right moment is hard — and disproportionately hurts non-technical builders. Founders, indie hackers, product managers, designers — people with strong product instincts but limited engineering background — miss skill opportunities every day. They don't invoke `cso` before merging a billing change. They don't run `qa` before pushing UI. They don't fire `health` at phase boundaries. The result: lower-quality outputs, missed safety checks, longer iteration cycles.

**aiSkillAdvisor closes that gap** by serving as an intelligent routing layer over the entire skill ecosystem.

---

## Target user

The **non-technical builder**:

- Indie founders building SaaS products without a CTO
- Product managers managing AI-assisted development
- Designers shipping code with AI help
- Solo entrepreneurs with product clarity but engineering gaps

Also useful for technical builders who want **systematic skill discipline** instead of relying on memory + judgment alone.

---

## How it works (in plain English)

When you ask your AI agent to do something — *"add a promo code to my checkout"* — aiSkillAdvisor reads the context (what files you're touching, what you're asking for, what kind of work it is) and **proactively suggests the right skill** before you even know one exists.

Behind the scenes it runs three checks:

1. **Where are you?** Repo root check — am I in a project the advisor knows about?
2. **What are you doing?** Files + keywords + work-type classification (data, visual, security, growth, performance, ambiguous-scope)
3. **What needs to fire?** Match work-type to skill — surface a one-line suggestion: *"Skill suggestion: `cso` — security review for billing PRs. Want me to invoke?"*

Plus **loop-prevention rules** so the AI doesn't cascade from "fix A" → "break B" → "fix B" → "break C" until your original goal is lost.

---

## Current status

**v0 — dogfooding.** The first instance of aiSkillAdvisor is currently in active use as a memory mandate inside a Claude Code session working on a real SaaS product (the maintainer's primary project). Every refinement made during real-world usage is captured and will inform v1 of the standalone product.

**See [`docs/HANDOFF.md`](docs/HANDOFF.md)** for the full state-of-work from the v0 dogfooding.

**Roadmap:**
- ✅ v0 — discipline + algorithm validated in real-world dogfooding (TDD methodology, baseline scenarios passed)
- ⏳ v0.5 — accumulate improvisations during 2-3 real pilots
- ⏳ v1 — extract from dogfood instance into portable, configurable standalone product
- ⏳ v1.1 — auto-discovery of installed skills, plain-language output layer
- ⏳ v2 — multi-platform (Cursor, Continue, Aider in addition to Claude Code)

---

## Core capabilities (target spec for v1)

| Capability | v0 status | Standalone v1 goal |
|---|---|---|
| Work-type classification (data, visual, security, growth, perf, ambiguous) | ✅ working | Generic taxonomy |
| Signal-based routing (file paths + keywords) | ✅ working | Per-project configurable |
| Loop-prevention layer (L1-L5) | ✅ working | Universal default |
| Rationalization tripwires (red flags + counter-rules) | ✅ working | Universal default |
| Open-world skill inventory | ✅ working | Universal default |
| Quality-judgment phrase override | ✅ working | Universal default |
| Routing cases A-F (auto/cross-section/novel/pivot/multi-type/read-only) | ✅ working | Universal default |
| **Configurable skill manifest** | ❌ not yet | **THE killer feature** |
| **Auto-discovery of installed skills** | ❌ not yet | One-time setup |
| **Plain-language output for non-tech users** | ❌ not yet | Critical UX |
| **Per-project profile schema** | ❌ not yet | Configurable per-repo |
| **CLI for managing skills + profiles** | ❌ not yet | Adoption blocker |

---

## Repository structure

```
aiSkillAdvisor/
├── README.md                          # You are here
├── LICENSE                            # PolyForm Noncommercial 1.0.0 (free personal; commercial via agreement)
├── LICENSING.md                       # Plain-English licensing guide + commercial inquiry path
├── docs/
│   ├── HANDOFF.md                     # State of work from v0 dogfooding
│   ├── PRODUCT_VISION.md              # Why this exists, target users, capabilities
│   ├── ARCHITECTURE.md                # Algorithm: routing, work-types, L1-L5, tripwires
│   ├── TESTING_PROTOCOL.md            # TDD methodology + baseline scenarios
│   └── BACKLOG.md                     # Candidate improvements + open questions
├── reference/
│   ├── v0-skill-advisor.md            # Copy of the live v0 instance (source of truth)
│   └── v0-improvisations.md           # Change log from dogfooding
├── prototypes/
│   └── manifest-schema-draft.yaml     # Proposed YAML schema for configurable skills
└── .gitignore
```

---

## Configurable skills capability

aiSkillAdvisor is designed from day one to support **adding new skills** to its advisory context. Users will be able to:

- Register their own skills via a simple YAML manifest
- Auto-discover skills installed via Claude Code plugins
- Curate per-project profiles (this skill applies to billing PRs in *this* repo, but not in *that* one)
- Contribute skill mappings back to the community via PR

A draft manifest schema is in [`prototypes/manifest-schema-draft.yaml`](prototypes/manifest-schema-draft.yaml).

---

## Contributing

This is an early-stage public repo. The v0 is being refined through real-world dogfooding before extraction into the standalone product. Contributions welcomed once v0.5 is reached (see roadmap above).

**Areas where input is especially valuable:**

- **Non-technical user feedback** — does the plain-language output actually help?
- **Skill mappings** — if you use a skill we haven't captured, propose a trigger row via PR
- **Edge cases** — situations where the advisor should fire but didn't, or vice versa
- **Multi-platform reports** — does the discipline translate to Cursor/Continue/Aider?

For now, please open an Issue rather than a Pull Request — we want to align on direction before merging code.

---

## License

**PolyForm Noncommercial 1.0.0** — see [LICENSE](LICENSE) for the legal text + [LICENSING.md](LICENSING.md) for a plain-English guide.

**Quick read:**
- ✅ **Free for personal, educational, research, hobbyist, and non-profit use** — no payment, no agreement needed
- 🤝 **Commercial use requires a separate agreement** — open a GitHub Issue and tag `@AmRaghuAkula` to start the conversation
- 📜 **Drafted by a lawyer (Heather Meeker, Polyform Project)** — solid foundation, not a hand-rolled license

This is a **fair-source** model — increasingly common in OSS since 2023 (used by HashiCorp, Sentry, Elastic, and others). It keeps the community-good mission intact while funding sustainability through commercial agreements.

---

## Maintainer

Built by [@AmRaghuAkula](https://github.com/AmRaghuAkula), with the explicit goal of helping non-technical AI enthusiasts get more value from the AI coding ecosystem.

Inspired by the recognition that **the right skill at the right moment is the difference between confident output and quiet anxiety** — and that recognition shouldn't require you to be a senior engineer.
