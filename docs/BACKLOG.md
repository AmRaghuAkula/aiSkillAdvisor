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

## Must-Build Features for v1

These are the founder-committed product features for the standalone product, captured 2026-06-01. Priorities assigned; **phasing TBD by founder** (will be slotted into the Phase Status table above as decisions land). Each feature has a brief spec + design notes.

### Distribution + accessibility (CRITICAL for adoption)

| ID | Feature | Priority | Spec | Notes |
|---|---|---|---|---|
| **F1** | Auto-sweep ability triggered by simple user instruction | **HIGH (Phase 2)** | User runs e.g. `aiskill-advisor sweep` or types `/sweep` and the tool scans installed Claude Code plugins (gstack, vercel, superpowers, etc.) + pre-populates the manifest with discovered skills. User reviews + accepts/rejects each. | Already drafted as `auto_discovery` placeholder in `prototypes/manifest-schema-draft.yaml` (Section 8) — elevate from draft to designed-and-built. Per-ecosystem adapter pattern needed (gstack/vercel/superpowers each package skills differently). |
| **F2** | Skill artifact distribution + one-command install | **HIGH (Phase 5)** | User runs ONE command — e.g. `npx aiSkillAdvisor init` OR `claude-code skill install aiSkillAdvisor` — and gets: (a) the advisor memory installed, (b) a starter project profile, (c) the slash command `/aiSkillAdvisor` available, (d) onboarding wizard launched. | Probably both a Claude Code plugin AND an npm package. Package the skill artifact so it can be added to a user's environment in a single step. Adoption blocker without this. |

### Onboarding (CRITICAL for non-tech audience)

| ID | Feature | Priority | Spec | Notes |
|---|---|---|---|---|
| **F3** | Onboarding wizard (umbrella) | **HIGH (Phase 4)** | Simple UI that captures user profile → saves to `onboard-guidelines.md` → guidelines become the working guidelines for aiSkillAdvisor (loaded at session-start). Algorithm gives weightage to skills based on profile. | Founder vision. Without this, adoption stalls at minute 5 because target user is non-technical. See sub-features O1-O10 below. |

#### Onboarding sub-features (founder's 5 original creative ideas)

| ID | Sub-feature | Priority | Notes from brainstorming |
|---|---|---|---|
| **O1** | Confidence-weighted question depth (3 required + 5 recommended + optional deep dive) | HIGH | Strong design. Watch labeling: "Recommended" framing guilts users into over-answering — re-label as "Skip anytime." |
| **O2** | Live preview during onboarding (right-side panel shows skill suggestions updating in real-time) | HIGHEST among the 5 | Best feature for non-tech audience — converts abstract questions into visible consequences. Watch for flicker/jitter as suggestions reshuffle on every keystroke. Debounce ~300ms. |
| **O3** | Persona templates (solo founder, designer-who-codes, PM in tech, indie hacker) | HIGH | Useful as starting point, dangerous as destination — hard-coded personas calcify. Pair with O9 (borrowed-profile) and make every template editable line-by-line. |
| **O4** | Re-onboarding cadence (90-day check-in) | **DOWNGRADED — weakest of the 5** | Cadence-based prompts feel like nag-ware. **Replace with event-triggered re-onboarding**: trigger on role change, repeated skill rejection (5+ in a row), or inventory update (new plugin installed). |
| **O5** | Confidence calibration ("HIGH confidence for X, MEDIUM for Y, LOW for Z") | MEDIUM-HIGH | Strong in principle, hard to execute honestly. Risk: confidence numbers without grounding feel arbitrary. Only ship if you can name the EVIDENCE behind each band (e.g., "high confidence because 80%+ skills in this domain are mapped"). |

#### Onboarding sub-features (NEW — from brainstorming agent 2026-06-01)

| ID | Sub-feature | Priority | Spec |
|---|---|---|---|
| **O6** | Show-don't-ask inference | **HIGHEST IMPACT (per brainstorming agent)** | Ask user to pick 2-3 sample tasks from a visual gallery; infer profile from picks. Bypasses self-report bias entirely — non-tech users systematically mis-rate their own AI literacy. |
| **O7** | Skill anti-recommendations | HIGH | Explicitly tell user which skills NOT to load given their profile, with reasoning. Reduces inventory anxiety + builds trust. ("You're a solo founder so you probably don't need `ios-design-review` right now — feel free to skip.") |
| **O8** | Guideline diff preview before commit | HIGH | Show user the markdown about to be written about them; let them edit in plain English. Increases ownership + catches misinterpretation. Critical for trust. |
| **O9** | Borrowed-profile cold start | HIGH | "Start with [persona]'s guidelines, adjust later" — lets users skip onboarding entirely and refine via use. Pairs with O3 (persona templates). |
| **O10** | Onboarding-as-conversation log | MEDIUM | Store the Q&A transcript alongside the guideline doc so future sessions can re-derive intent if the doc gets stale. Long-tail value. |

### Trust + safety (FOUNDATION)

| ID | Feature | Priority | Spec | Notes |
|---|---|---|---|---|
| **F4** | Dry-run mode | **HIGH (Phase 3)** | `aiskill-advisor dry-run "I want to add a promo code system"` → shows what skills WOULD fire without invoking. | Critical for trust. Users need to see judgment before letting the advisor influence real work. |
| **F5** | Acceptance learning / per-suggestion sunset | **HIGH (Phase 3)** | Advisor tracks suggestion accept/decline patterns. After 10 declines of same suggestion in same context → stop suggesting in that context. (Per-context sunset, not global.) | Without this, advisor feels naggy → users disable. Build feedback loop into weightage algorithm. |
| **F7** | Privacy / local-first architecture | **MUST DESIGN FROM DAY 1 (Phase 1)** | By default: no telemetry, no remote calls. Manifest on disk. Suggestion history on disk. Nothing phones home without explicit opt-in. | Trust foundation. Not a feature — an architecture default. Non-tech users worry about data; local-first eliminates the worry. |

### Visibility + usability

| ID | Feature | Priority | Spec | Notes |
|---|---|---|---|---|
| **F6** | Skill ledger / status command | MEDIUM (Phase 4) | `aiskill-advisor status` → shows which skills registered, which fired this week, which never fire (stale), which most-used, which highest-value (per user feedback). | Visibility into what's in the system. Without ledger, advisor is a black box. |
| **F9** | Cost / time awareness | MEDIUM (Phase 3-4) | When suggesting a skill, show estimated cost (LLM tokens) + estimated time (long-running). Example: *"Skill suggestion: `qa` — ~5 min, ~$0.40 in LLM calls. Want me to invoke?"* | Lets user weigh suggestion against budget. Expensive skills feel scary without context. |

### Future / deferred

| ID | Feature | Priority | Spec | Notes |
|---|---|---|---|---|
| **F8** | Skill recipes / playbooks | LOW (Defer to v2) | User-defined multi-step flows. Example: "pre-launch checklist" runs `qa` + `cso` + `health` + `benchmark` in sequence. | Useful but adds complexity; users don't need it day 1. |

---

## Generalizations from Pilot 1 (REBRAND-024 /signin — 2026-06-01)

Pilot 1 surfaced 3 v0 refinements + 3 product-level generalizations for the standalone v1. The v0 refinements were applied to `feedback_proactive_skill_advisor.md` directly + logged in `skill_advisor_improvisations.md`. The product-level generalizations below become v1 features.

| ID | Generalization | Priority | Spec |
|---|---|---|---|
| **P1** | Manifest schema needs `precondition` field per skill | **HIGH (Phase 2)** | Each skill in the manifest gets an optional `precondition` field (boolean expression evaluated at routing time). Examples: `direction_locked == false` for `design-shotgun`; `task_intent != match_locked_system` for `frontend-design`. Routing engine evaluates preconditions before firing. |
| **P2** | Verify capability needs built-in static-server shim | **HIGH (Phase 3)** | Verify step (used in `verification-before-completion`, `browse`-style validation, design-review of sandbox HTML) must auto-detect a static-server runtime: Node `npx http-server`, Python `http.server`, Bun `serve`. Never assume `file://` works (Playwright MCP blocks it). Never assume a specific runtime is installed. |
| **P3** | Match-vs-generate semantic in skill metadata | **MEDIUM (Phase 2)** | Skills should declare in their manifest entry whether they GENERATE novel work (`frontend-design`, `design-shotgun`) or MATCH existing systems (the hand-build pattern for /signin). Some skills do both; that's fine. Routing engine uses this to avoid firing "generate novel" skills when the task is "match locked". |

---

## Brainstorming-derived design constraints (anti-patterns to AVOID)

From the brainstorming agent 2026-06-01 — design choices that would hurt the target non-tech audience. Apply these as constraints across F1-F9 + O1-O10:

| Anti-pattern | Why to avoid | Counter-design |
|---|---|---|
| **Asking users to self-rate AI literacy on a 1-10 scale** | Non-tech users systematically under- or over-rate themselves — the answer is noise. | Infer from task choice (O6) instead. |
| **Showing the full 180+ inventory at any point in onboarding** | Induces choice paralysis + impostor feeling. | Surface 5-7 skills max at any time. Progressive disclosure. |
| **Requiring goal articulation upfront** | Non-tech users discover goals by seeing options, not by stating them. | Reverse it: show possibilities, let them point. |
| **Skill jargon in question wording ("Do you need RAG?")** | User can't recognize skill names. | Translate to outcomes ("Do you want the advisor to read your own docs?"). Jargon only in tooltips. |
| **Gating value behind onboarding completion** | First skill suggestion must appear before question 3, or drop-off spikes. | Show value progressively from question 1 onward. |

---

## Failure-mode countermeasures (from brainstorming agent)

Specific stumble points common in non-tech-user onboarding, with countermeasures:

| Stumble point | Counter-design |
|---|---|
| **Vocabulary mismatch** — user can't recognize skill names | Outcome-phrased labels everywhere; jargon in tooltip only |
| **Premature commitment** — user picks a persona and feels locked in | Persistent low-friction "this isn't me" escape button on every screen |
| **Empty-state shame** — "I have no projects" feels disqualifying | Explicit aspirational track treats no-projects as a first-class state |
| **Trust collapse on first bad recommendation** — non-tech users don't retry | Confidence labels + one-tap "wrong skill, here's why" feedback loop wired into weightage |
| **Abandoned mid-flow** — user stops halfway through onboarding | Every screen produces a usable (if rough) guideline doc — partial completion still yields value |

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
