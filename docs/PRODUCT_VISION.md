# aiSkillAdvisor — Product Vision

**Vision captured:** 2026-06-01
**Status:** Long-term direction. NOT urgent. NOT next.

---

## The pain we're solving

The Claude Code skill ecosystem has 180+ skills across plugin namespaces (gstack, vercel, superpowers, claude-md-management, postman, hf-skills, etc.). Each skill is well-documented IF you know to look for it.

**The discovery problem:** finding the right skill at the right moment.

This problem disproportionately hurts **non-technical builders** — founders, indie hackers, product people, designers — who have product instincts but lack engineering instincts. They miss skill opportunities (don't invoke `cso` before merging billing changes; don't invoke `qa` before pushing UI; don't invoke `health` before a phase boundary) and ship lower-quality outputs as a result.

**aiSkillAdvisor closes that gap** by serving as an intelligent routing layer over the entire skill ecosystem.

---

## Target user

### Primary persona: the non-technical builder

Examples:
- Indie founders building SaaS products without a CTO
- Product managers managing technical agents
- Designers shipping code with AI assistance
- Solo entrepreneurs (e.g., the project maintainer themselves, who self-describes as "not technical-leaning")

Common traits:
- Strong product instincts
- Limited engineering instincts (no senior-dev memory of "this is the moment to run X")
- Time-pressured (no bandwidth to read 180 skill descriptions)
- Quality-anxious (want confidence their AI output is good, but don't have the technical depth to verify)

### Secondary persona: technical builders wanting systematic discipline

Even experienced engineers benefit from systematic skill discipline. Memory + judgment alone is inconsistent. A routing layer mechanizes the discipline.

---

## What the standalone product looks like

```
                    ┌────────────────────────────┐
                    │   aiSkillAdvisor           │
                    │   - reads project context  │
                    │   - classifies work-type   │
                    │   - routes to right skill  │
                    │   - plain-language output  │
                    │   - configurable manifest  │
                    └─────────────┬──────────────┘
                                  │ wraps
                  ┌───────────────┼────────────────┐
                  ▼               ▼                ▼
         gstack (~40 skills)  vercel (~25)  superpowers (~13)
         huggingface (~10)    postman       claude-md-management
         + user's custom skills (open-world)
```

---

## Core capabilities (target spec for standalone v1)

| Capability | Inherited from the dogfood project v0? | Standalone-product addition |
|---|---|---|
| Work-type classification (data, visual, security, growth, perf, ambiguous) | ✅ Yes | Generic taxonomy, not the dogfood project-specific |
| Signal-based routing (file paths + keywords) | ✅ Yes | Adapts to any project via config |
| Loop-prevention layer (L1-L5) | ✅ Yes | Universal discipline |
| Rationalization tripwires (red flags + counter-rules) | ✅ Yes | Universal |
| Open-world rule (skill inventory ≠ trigger table) | ✅ Yes | Essential for community usage |
| Quality-judgment override | ✅ Yes | Generic |
| Routing cases A-F | ✅ Yes | Universal |
| **Configurable skill manifest** — users add their own skills + project profiles | ❌ NEW | The product's killer feature |
| **Auto-discovery** of installed skills (gstack, vercel, etc.) | ❌ NEW | One-time setup |
| **Plain-language output layer** for non-technical users | ❌ NEW | Critical UX |
| **Project profile** schema — define what work-types belong to which section per project | ❌ NEW | Configurable per-repo |
| **Public manifest format** (YAML or JSON) | ❌ NEW | Allows community contributions |
| **CLI / interface** for adding/managing skills + profiles | ❌ NEW | Adoption blocker without this |

---

## Configurable skills capability (founder requirement)

Founder explicitly stated on 2026-06-01:
> *"the capability to configure the skills, meaning add new skills to the skill advisor so that it is taking them into its context."*

**What this means concretely:**

- Users register their own skills via manifest (YAML) entries
- Each skill entry includes: name, when-to-use, what-it-touches (file globs), mutating-or-readonly, link to skill source
- aiSkillAdvisor reads the manifest at session-start
- Routing tables auto-populate from the manifest
- Users can curate their own sections (§1/§2/§N) per project
- Auto-sweep: a one-command operation that scans installed Claude Code plugins and pre-populates the manifest

Example manifest entry (target spec):

```yaml
- skill: gstack:cso
  when_to_use: "before merging a PR touching billing, auth, RLS, webhooks, service-role, Stripe"
  what_it_touches: ["src/lib/billing/**", "src/app/api/billing/**", "src/lib/auth/**"]
  mutating: false  # cso is read-only
  ecosystem: gstack

- skill: my_company.custom_review
  when_to_use: "before any PR touching customer-facing email templates"
  what_it_touches: ["templates/email/**"]
  mutating: false
  ecosystem: custom
```

Full schema draft: see [`prototypes/manifest-schema-draft.yaml`](../prototypes/manifest-schema-draft.yaml).

---

## Distribution model

**Likely path:** open-source on GitHub.

- Repository: `github.com/AmRaghuAkula/aiSkillAdvisor` (this repo)
- License: **PolyForm Noncommercial 1.0.0** (fair-source — free for personal/educational/non-profit/research; commercial requires separate agreement). See [`LICENSING.md`](../LICENSING.md).
- Distribution methods (TBD by Phase 5):
  - `npm install -g aiskill-advisor` OR
  - `npx aiskill-advisor init` from any project root OR
  - Claude Code plugin registry once that exists
- Documentation site: non-technical-friendly walkthrough — like how Vercel writes docs, not how Linux man pages read

---

## Why NOW is NOT the right time to extract

Per the discussion on 2026-06-01:

1. **Premature optimization** — we have a paper design that passed synthetic tests, but ZERO real-work evidence
2. **Loop-creep risk** — pivoting to community product before validating the prototype is the same L4 anti-pattern aiSkillAdvisor itself warns against
3. **Engineering scope is real** — ~30-50 hours of focused engineering + user research + iteration
4. **Better signal later** — by the time we run 2-3 real the dogfood project pilots, we'll have evidence on what the community version actually needs (vs. what we'd guess today)

---

## Sequencing — when to revisit

| Milestone | Trigger | Action |
|---|---|---|
| **v0 deployed** | ✅ Done 2026-06-01 | Continue dogfooding |
| **First real pilot complete** | When Pilot 1 (sign-in mockup) ships | Log learnings in `skill_advisor_improvisations.md` |
| **3 cumulative pilots successful** | Probably ~4-6 weeks out | Revisit this vision; decide if extraction is justified |
| **Phase 4 the dogfood project ships** | After the dogfood project rebrand launches | If 3+ pilots succeeded AND founder still wants standalone product → start extraction work (Phase 1) |
| **First non-the dogfood project session uses v0** | Founder spawns session in secondary maintainer projects | First test of cross-project portability |

---

## Decision rule for revisiting

**Don't start the standalone product if any of these is true:**

- Fewer than 2 successful the dogfood project pilots have completed
- The the dogfood project rebrand isn't complete or near-complete
- Founder has shifted priorities (capacity matters)
- No real user research with target non-technical persona has happened

**Do start the standalone product if all of these are true:**

- 3+ the dogfood project pilots have validated the advisor improves real-work outcomes
- the dogfood project is past launch or in maintenance
- Founder has explicitly approved the engineering investment
- 2-3 target users (other non-technical builders) have signaled interest

---

## Open questions for the standalone product (parking lot)

| Question | Why it matters |
|---|---|
| GitHub home — is `AmRaghuAkula/aiSkillAdvisor` the long-term home, or move to an org? | Branding for community adoption |
| Pricing model — fully OSS, or freemium with Pro tier? | Sustainability vs. accessibility tension |
| Auto-discovery mechanism for different ecosystems | gstack, vercel, superpowers all package skills differently |
| How do users discover aiSkillAdvisor itself? | Naming/branding/launch strategy |
| Integration with Claude Code's native skill system | Does Claude Code already plan a meta-skill layer? If so, don't compete — partner |
| Multi-platform (Cursor, Continue, Aider) | Same advisor logic could work, different integration |
| Naming conventions for skills not in any plugin | "Custom" / "personal" / "private" — pick one |
| How does the advisor surface in different IDEs? | Inline suggestion vs. side panel vs. modal — UX research needed |

---

## Related artifacts

| Where | What |
|---|---|
| the dogfood project memory directory | The live v0 instance + improvisations log (source of truth) |
| This repo's `reference/` folder | Copies for handoff context |
| This repo's `docs/ARCHITECTURE.md` | Full algorithm specification |
| This repo's `docs/TESTING_PROTOCOL.md` | TDD methodology + baseline scenarios |
| This repo's `docs/BACKLOG.md` | Candidate improvements + open questions queue |
| `~/.claude/plans/delightful-frolicking-newell.md` (in founder's local Claude data) | Original dogfood-project×gstack skill mapping that informed v0 |

---

*Last updated: 2026-06-01. Revisit cadence: after each successful the dogfood project pilot. Do not invest engineering until decision-rule criteria are met.*
