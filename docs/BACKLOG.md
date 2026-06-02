# aiSkillAdvisor — Backlog + Open Questions

**Date:** 2026-06-01
**Status:** Curated from HireAstra v0 dogfooding + the standalone-product vision

This document tracks **candidate improvements** for aiSkillAdvisor and **open questions** that need resolution before the standalone product can ship.

---

## How to use this backlog

| When | What to do |
|---|---|
| You spot a gap during HireAstra dogfooding | Log it as a candidate in the **Improvisations Queue** below |
| A candidate becomes validated via TDD cycle | Move it from Improvisations Queue → Implemented (in `reference/v0-improvisations.md`) |
| You hit an open question that blocks progress | Add it to **Open Questions** below; flag the blocking dependency |
| You complete a Phase milestone | Update the **Phase Status** table |

---

## Phase Status

| Phase | Description | Status | Decision Gate |
|---|---|---|---|
| **0 — Dogfood + validate** | Run 2-3 real HireAstra pilots with v0 active | 🟡 In progress (1st pilot: REBRAND-024 /signin running) | After 3 successful pilots → proceed to Phase 1 |
| **1 — Extract abstraction** | Pull HireAstra-specific bits out; design per-project profile schema | 🔴 Not started | After Phase 0 validates |
| **2 — Manifest format + auto-discovery** | YAML schema for skill manifests + plugin auto-detection | 🔴 Not started | After Phase 1 abstraction stabilizes |
| **3 — Plain-language output layer** | Translate technical output into non-tech-friendly phrasing | 🔴 Not started | Critical UX for target user |
| **4 — Configuration UX** | Easy CLI/UI for non-tech users to add skills + curate profiles | 🔴 Not started | Adoption blocker without this |
| **5 — Packaging + distribution** | npm / Claude Code plugin / docs site | 🔴 Not started | Required for community launch |
| **6 — Multi-platform** | Extend to Cursor, Continue, Aider | 🔴 Not started | After single-platform v1 is stable |

---

## Improvisations Queue (candidate refinements)

Items below are CANDIDATES that may become implemented refinements after TDD validation. Not yet applied to v0. Re-evaluate periodically.

| # | Candidate | Trigger | Generalizable? | Priority |
|---|---|---|---|---|
| C1 | Add §3 Growth/Marketing trigger row | First growth session opens (CASE C) | YES — common project domain | Medium |
| C2 | Add §4 Ops/Customer Success | First ops session opens | YES — common project domain | Medium |
| C3 | Time-box mechanism (max N minutes per L1 goal before forced surface) | Loop scenarios in real work | YES — universal safety | Low-Medium |
| C4 | Skill "freshness" — flag stale trigger entries that never fire | After 1+ month of dogfooding | YES — quality signal | Low |
| C5 | Per-session opt-out flag | Session legitimately wants no advisor | YES — UX improvement | Low |
| C6 | Plain-language wrapper for non-tech-friendly phrasing | When testing with non-technical user beyond founder | YES — **CRITICAL for standalone product** | **High (Phase 3)** |
| C7 | Skill catalog auto-discovery | Founder adds new plugin or ecosystem | YES — **CRITICAL for standalone product** | **High (Phase 2)** |
| C8 | Quality-judgment phrase expansion (e.g., "tasteful", "refined", "thoughtful") | Found in real-work prompts | YES — extensibility | Medium |
| C9 | "Rationale fatigue" detection — flag perfunctory rationales in training data | If Claude Chat / dogfood sessions produce shallow rationales | YES — training-data quality | Medium |
| C10 | Multi-pilot aggregation view — show cross-pilot patterns in improvisations | After 3+ pilots logged | YES — analytics | Medium |
| C11 | "Defer to Skill Advisor" mode for production sessions (post-v1) | When v1 ships and external sessions need to defer | YES — operating-mode discipline | Phase 1+ |
| C12 | Integration with `superpowers:writing-skills` for ongoing TDD discipline | Every refinement cycle | YES — process discipline | Already discipline (implicit) |
| C13 | Per-section section-leader assignment (who curates §1 vs §2) | When multiple sessions co-own sections | YES — governance pattern | Medium |
| C14 | Conflict-resolution rule for cross-section work (CASE B clarification) | When work genuinely spans sections | YES — already partially handled by CASE E supersession | Low |
| C15 | Skill cost awareness (some skills are slow/expensive; advisor should weight) | When invoking heavy skills (e.g., full QA suites) | YES — efficiency | Low |

---

## Open Questions

These need resolution before specific phases can begin. Each blocks something downstream.

### Architectural

| # | Question | Blocks | Resolution path |
|---|---|---|---|
| Q1 | Does Claude Code already plan a meta-skill layer? If so, partner instead of compete | Phase 5 distribution | Ask Anthropic; check Claude Code roadmap |
| Q2 | How do users discover aiSkillAdvisor itself? | Phase 5 launch strategy | Marketing research; community feedback after Phase 0 |
| Q3 | Auto-discovery mechanism — gstack, vercel, superpowers package skills differently. How to unify? | Phase 2 | Research each plugin's manifest format; design adapter pattern |
| Q4 | What's the right manifest format — YAML, JSON, TOML? | Phase 2 | Start with YAML (most human-readable); revisit based on user feedback |
| Q5 | Should the manifest support inheritance (project A inherits B's profile + overrides)? | Phase 1 | Probably yes for v1.5+; v1 keeps it flat |
| Q6 | How does the advisor surface in different IDEs (Claude Code, Cursor, Continue)? | Phase 6 multi-platform | Inline suggestion vs. side panel vs. modal — UX research |

### Distribution / Business

| # | Question | Blocks | Resolution path |
|---|---|---|---|
| Q7 | GitHub home — `AmRaghuAkula/aiSkillAdvisor` long-term, or move to an org? | Branding stability | Founder decision; could create org if community contributions grow |
| Q8 | Pricing model — fully OSS or freemium with Pro tier? | Sustainability vs. accessibility | Founder decision after Phase 3 |
| Q9 | How do contributors propose new trigger rows? Via PR? Via curated manifest registry? | Community contribution model | Design contribution workflow before opening PRs (post-v0.5) |
| Q10 | Versioning strategy — semver, calver, other? | Phase 5 packaging | Probably semver; v0.x.y during dogfooding |

### UX / Target user

| # | Question | Blocks | Resolution path |
|---|---|---|---|
| Q11 | What does "plain language" look like for non-tech users? Need example translations | Phase 3 | Draft 20 translations; test with 3-5 non-tech users |
| Q12 | How does the advisor surface a suggestion in an IDE? Inline? Modal? Chat-only? | Phase 6 | UX research with target users |
| Q13 | What's the ideal "first 5 minutes" for a new user adopting aiSkillAdvisor? | Phase 4 onboarding UX | Design onboarding flow; test with non-tech users |
| Q14 | How do users add their own custom skills if they're not coding? | Phase 4 configuration UX | Maybe a GUI for skill registration; CLI as power-user option |

### Quality / Process

| # | Question | Blocks | Resolution path |
|---|---|---|---|
| Q15 | Should every trigger row have a verbatim red-flag phrase example? | Process robustness | Probably yes; standardize during Phase 1 abstraction |
| Q16 | What's the RED-test scenario count threshold before a refinement is "ready"? | TDD discipline | 1 RED + 1 GREEN minimum per refinement; more for complex changes |
| Q17 | How do we test the advisor when there's no real-work pilot available (regression testing)? | Continuous quality | Maintain the 4 baseline scenarios as regression suite; expand as patterns emerge |

---

## Out-of-Scope (explicitly NOT in backlog)

| Item | Why excluded |
|---|---|
| ❌ Auto-invocation of skills without permission | Violates Skill Advisor discipline. Permission is non-negotiable. |
| ❌ Replacing existing skill systems (gstack, vercel, etc.) | Wrong layer. Advisor wraps; doesn't replace. |
| ❌ Building new skills from scratch as part of aiSkillAdvisor | Wrong scope. Advisor routes EXISTING skills. |
| ❌ AI-generated trigger rows without human review | Quality risk. Triggers reviewed by founder/maintainer. |
| ❌ Adding paid skills to the manifest without licensing review | Legal risk. MIT only for v0; commercial integrations require explicit licensing. |
| ❌ Building a "skill marketplace" — that's a different product | Stay focused on routing/advisory. |

---

## How candidates graduate to implemented refinements

```
[Spotted during work]
        ↓
[Logged here as candidate]
        ↓
[RED test written + run with fresh subagent]
        ↓
[Failure pattern verbatim documented]
        ↓
[GREEN minimal rule written]
        ↓
[Re-test with fresh subagent; verify compliance]
        ↓
[REFACTOR — close loopholes; check edge cases]
        ↓
[Apply to v0 (HireAstra memory) + log in v0-improvisations.md]
        ↓
[Mark as ✓ Implemented in this BACKLOG.md]
        ↓
[Eventually batch into consolidated PR to this repo]
```

Per the Iron Law from [`TESTING_PROTOCOL.md`](TESTING_PROTOCOL.md): **NO CHANGE WITHOUT A FAILING TEST FIRST.**

---

## Related files

- [`reference/v0-improvisations.md`](../reference/v0-improvisations.md) — the live changelog of validated refinements
- [`reference/v0-skill-advisor.md`](../reference/v0-skill-advisor.md) — the canonical v0 instance
- [`docs/TESTING_PROTOCOL.md`](TESTING_PROTOCOL.md) — TDD methodology for refinements
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — the algorithm being refined
- [`docs/HANDOFF.md`](HANDOFF.md) — overall state-of-work
