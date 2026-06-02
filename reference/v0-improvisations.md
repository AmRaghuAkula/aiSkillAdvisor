# Skill Advisor — Improvisations Log (Reference Copy)

> **⚠ SOURCE OF TRUTH:** The live, mutable improvisations log lives at:
> `C:\Users\raghu\.claude\projects\c--Users-raghu-Projects-OnePersonAICompany\memory\skill_advisor_improvisations.md`
>
> This file is a **frozen reference snapshot** captured 2026-06-01. Edits to the improvisations log happen in the memory directory during HireAstra dogfooding; this reference file is updated periodically via consolidated PR (per founder's plan).

---

## Purpose

Every time we improvise or refine the Skill Advisor during HireAstra dogfooding, the change gets logged here. This log **IS the v1 changelog** when we eventually extract the standalone product.

**Discipline:** ANY change to the v0 OR new learning that should feed into the standalone product MUST be appended below. **No silent edits to the v0 — they all get a log entry here.**

---

## Log format

```
## YYYY-MM-DD — short title
- Trigger: what surfaced this change (real-work moment, gap noticed, founder feedback)
- Change: what was modified in the advisor
- Generalizable? yes/no — does this belong in the standalone v1?
- Standalone-spec implication: (if yes) what the standalone product needs to inherit
```

---

## 2026-06-01 — Skill Advisor v0 deployed (TDD-validated)

- **Trigger:** Founder mandate on 2026-06-01 to elevate the prior proactive-skill-advisor memory into a TDD-validated, signal-routed system with §1/§2 separation.
- **Change:** Full restructure with: routing algorithm (Signal 0 repo check + Signal 1 file paths + Signal 2 keywords/work-type), loop-prevention L1-L5, rationalization tripwires (3 patterns + counter-rules), red-flag phrases table, open-world rule, quality-judgment override, work-type classification step, CASE A-F routing logic.
- **Validation:** `superpowers:writing-skills` invoked; baseline RED test ran 3 scenarios (promo codes, premium polish, ATS perf) + exposed 3 failure patterns verbatim. GREEN re-test ran same 3 + 1 loop temptation scenario; ALL 4 PASS.
- **Generalizable?** YES — all of the above is universal pattern, not HireAstra-specific.
- **Standalone-spec implication:** This is the core algorithm. Everything in the standalone v1 is built on this foundation.

## 2026-06-01 — REFACTOR gap fixes

- **Trigger:** GREEN re-test surfaced 3 minor gaps: CASE E/B precedence ambiguity; L2 budget too tight for read-only/planning skill chains; Signal 0 repo list missing HireAstra-Pricing-Model.
- **Change:** (1) CASE E supersedes CASE B when both apply — multi-type is broader, cross-section is its subset. (2) L2 budget excludes read-only/planning skills (`brainstorming`, `spec`, `writing-plans`, `code-review`, `design-review`, `verification-before-completion`, `investigate`, `browse`, `qa-only`, `health`); only mutating/deploying skills count. (3) Signal 0 adds `HireAstra-Pricing-Model` to in-scope repos.
- **Generalizable?** YES for (1) and (2). (3) is HireAstra-specific path, but the *pattern* (Signal 0 enumerates in-scope project roots) is generic.
- **Standalone-spec implication:** Both (1) and (2) need to be defaults in the standalone product. (3) becomes a per-project config item — the standalone product reads project-roots from a config file, not from hardcoded paths.

## 2026-06-01 — Identity rebrand: "Skill Advisor" as product name

- **Trigger:** Founder vision to extract into standalone open-source product. Named "Skill Advisor" as product identity.
- **Change:** Memory file frontmatter `name: proactive-skill-advisor` → `skill-advisor`. Title renamed. MEMORY.md pointer text updated. File path retained for stability of any cross-references.
- **Generalizable?** YES — the product name carries forward.
- **Standalone-spec implication:** Product name is **aiSkillAdvisor** (per founder's GitHub repo). Repo/package naming should follow.

## 2026-06-01 — Handoff bundle staged to aiSkillAdvisor repo

- **Trigger:** Founder spinning up parallel session to develop the standalone product. Handoff materials required.
- **Change:** Created bundle in `github.com/AmRaghuAkula/aiSkillAdvisor` with: LICENSE (MIT), .gitignore, expanded README, docs/ (HANDOFF, PRODUCT_VISION, ARCHITECTURE, TESTING_PROTOCOL, BACKLOG), reference/ (this file + v0-skill-advisor.md), prototypes/ (manifest-schema-draft.yaml). 4 logical commits.
- **Generalizable?** YES — the documentation pattern itself is the v1 onboarding spec.
- **Standalone-spec implication:** Standalone product will have a similar docs structure for its own contributors. ARCHITECTURE.md becomes the canonical algorithm spec.

---

## Open improvisations queue (things to add when validated)

Items below are CANDIDATES that may become improvisations after more real-work dogfooding. Not yet applied to v0; not yet generalizable to v1. Re-evaluate periodically.

| Candidate | Trigger | Why it might matter |
|---|---|---|
| Add §3 Growth/Marketing trigger row | When first growth session opens (CASE C) | First demonstration of extensibility |
| Add §4 Ops/Customer Success | When founder spawns ops session | Pattern repeats |
| Time-box mechanism (max N minutes per L1 goal before forced surface) | Loop scenarios in real work | Adds time-based safety to L2's invocation-based safety |
| Skill "freshness" — flag stale trigger entries | After 1+ month of dogfooding | If a trigger row never fires, it may be wrong |
| Per-session opt-out flag | When a session legitimately wants no advisor | UX improvement |
| Plain-language wrapper (non-tech-friendly phrasing) | When testing with non-technical user | **CRITICAL for standalone product** |
| Skill catalog auto-discovery | When founder adds a new plugin or ecosystem | Eliminates manual manifest curation |

---

## Real-work pilot results (validation data for the standalone product)

Each row below is a real pilot moment where the advisor fired (or should have). These become test cases for the standalone v1.

| Date | Pilot context | What the advisor did | Right outcome? | Lesson |
|---|---|---|---|---|
| 2026-06-01 | REFACTOR phase of writing-skills validation | CASE F correctly skipped advisor for "rename file to Skill Advisor" Q&A turn | ✅ | Q&A discipline holds in practice, not just in synthetic tests |
| TBD | REBRAND-024 /signin pilot (in progress) | TBD | TBD | TBD |
| TBD | REBRAND-022 /404 pilot | TBD | TBD | TBD |
| TBD | First non-HireAstra session | TBD | TBD | Tests cross-project generalizability |

---

## Related (in HireAstra memory)

- `feedback_proactive_skill_advisor.md` — the live v0 memory file
- `project_skill_advisor_vision.md` — the standalone-product vision
- `feedback_design_session_scope_only.md` — scope rule complementing the advisor
- `feedback_fix_audit_protocol.md` — discipline that motivated the confidence-level rules

---

*Discipline reminder: any change to the Skill Advisor v0 gets a log entry here. No silent edits. This file IS the v1 changelog.*
