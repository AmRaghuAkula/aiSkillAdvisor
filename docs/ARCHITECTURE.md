# aiSkillAdvisor — Architecture Specification

**Version:** v0 (the dogfood project dogfooding instance)
**Date:** 2026-06-01
**Source:** Extracted from the live the dogfood project v0 memory file

This document is the **canonical algorithm specification** for aiSkillAdvisor. It describes how a session should be routed to the right skill suggestions, how loops are prevented, and how rationalizations are caught before they cause misroutes.

---

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ SESSION STARTS                                                  │
│   1. Declare L1 goal anchor (1 sentence, pinned)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ SIGNAL 0 — Repo Root Check                                      │
│   Is the session in a known project root?                       │
│   - YES → proceed                                               │
│   - NO  → skip advisor entirely (out of scope)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ CASE F — Read-only / Q&A Skip                                   │
│   Is this purely informational (lookup, brainstorm w/o intent)? │
│   - YES → skip advisor entirely (no false-positive suggestions) │
│   - NO  → proceed                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ SIGNAL 1 — File Paths Match                                     │
│   Match expected files-touched against section path tables.     │
│   Output: vote per section (§1, §2, ...)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ SIGNAL 2 — Keywords + Work-Type Classification                  │
│   Classify FIRST, then match. Multi-type work surfaces multiple │
│   skills, not just first match.                                 │
│   Output: work-type list, sections involved                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ ROUTING DECISION (Case A-F)                                     │
│   Match signal combination to a case, take corresponding action │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ SURFACE SUGGESTION(S)                                           │
│   Use format: "Skill suggestion: `<name>` — `<value>`. Want?"   │
│   ONE at a time. Always ask permission. Never auto-invoke.      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ LOOP-PREVENTION LAYER (L1-L5) — active across all steps         │
│   L1: goal anchor protects against scope drift                  │
│   L2: invocation budget (mutating skills only)                  │
│   L3: regression detection (precondition tracking)              │
│   L4: scope-creep alarm (file-set growth)                       │
│   L5: cycle detection                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Signal 0 — Repo Root Check

**Purpose:** Don't fire the advisor in unrelated directories.

**Algorithm:**

```
known_roots = [
    "~/Projects/MyProject",
    "C:\Users\raghu\Projects\the dogfood project-design-sandbox",
    "C:\Users\raghu\Projects\the dogfood project-Pricing-Model",
    # (extensible — per-project profile defines this list)
]

if session.cwd not in known_roots:
    return SKIP_ADVISOR
```

**Future:** In the standalone product, `known_roots` becomes a per-project configuration item in the user's manifest.

---

## CASE F — Read-only / Q&A Skip

**Purpose:** Don't generate false-positive suggestions on informational turns.

**Trigger conditions:**

The session is:
- Answering a state question ("What's the current X?")
- Reading files without proposing edits
- Brainstorming without implementation intent
- Pure architectural discussion

**Action:** Skip advisor entirely. No skill suggestion fires.

---

## Signal 1 — File Paths Match

**Purpose:** Route based on what files the session expects to touch.

**v0 instance (the dogfood project-specific) example:**

```
ROUTES TO §1 — Core Engine
  src/lib/billing/**            src/lib/credit-manager.ts
  src/lib/stripe.ts             src/lib/plans.ts
  src/lib/auth/**               src/lib/llm-chain.ts
  src/lib/ai-provider.ts        src/lib/ai-models.ts
  src/lib/avatar-prompts.ts     src/lib/avatar-formatter.ts
  src/lib/avatar-validator.ts   src/lib/ats-scorer.ts
  src/app/api/**                supabase/migrations/**
  supabase/schema.sql           src/middleware.ts (behavior)
  scripts/backfill-*            CI workflow files
  MIGRATION_STATUS.md           MIGRATION_DECISIONS.md
  handoff §6 docs               MERGE_CHECKLIST.md

ROUTES TO §2 — Design + Brand
  src/app/globals.css           tailwind.config.*
  src/app/layout.tsx            src/app/page.tsx (visual)
  src/app/og/route.tsx          src/app/maintenance/page.tsx
  src/components/landing/**     src/components/Wordmark.tsx
  src/components/layout/**      src/components/ftue/**
  src/components/ui/**          public/brand/**
  public/favicon.svg            the dogfood project-design-sandbox/**
  the dogfood project-Pricing-Model/**
```

**Future (standalone product):** These tables become **per-project profile YAML**, not hardcoded.

---

## Signal 2 — Keywords + Work-Type Classification

**Purpose:** Classify the WORK first, then match to skill surface. **This is the critical anti-bias step.**

### Work-type taxonomy

| Work-type | Keywords / signals | Default section |
|---|---|---|
| **data/financials** | billing, payment, Stripe, credits, subscription, refund, webhook | §1 |
| **security/auth** | auth, login, session, RLS, security, service-role | §1 |
| **AI/LLM/scoring** | AI provider, LLM, prompt, resume parsing, ATS scoring | §1 |
| **infra/migration** | database, migration, schema, RPC, audit log, cron | §1 |
| **perf/debug** | slow, latency, regression, investigate, profile | §1 (perf row) |
| **visual/brand** | design, brand, color, font, typography, motion, animation, hero, landing, logo, mockup, layout, UI, button styling | §2 |
| **quality-judgment** | "premium", "feels like", "polish", "$X/mo feel", "elevated", "sophisticated" | §2 — **overrides trivial-action skip** |
| **growth/loyalty/abuse** | promo, referral, campaign, A/B test, conversion, funnel, retention | **HYBRID** — surface §1 (billing logic) + propose §3 |
| **ops/support** | help center, support, refund handling, escalation, dispute | propose §N |
| **spec-ambiguous** | "I want to add X but not sure how", "let's brainstorm", "what would Y look like" | invoke `superpowers:brainstorming` or `spec` first |

### Anti-bias rule (critical)

**List ALL work-types this task spans FIRST.** Each work-type matches a skill surface independently. Multi-type work surfaces multiple skills.

**WRONG:** "Stripe is in the trigger table → `cso`. Done." (anchor bias)
**RIGHT:** "This work has Stripe (data/financials → `cso`) AND referral attribution (growth/loyalty → propose §3) AND ambiguous discount mechanics (spec-ambiguous → `brainstorming` or `spec`). Surface all three."

---

## Routing cases

| Case | Trigger condition | Action |
|---|---|---|
| **A** | ≥80% signals align with one section | Auto-route silently. No notification. |
| **B** | Work spans §1 + §2 (cross-section) | Surface ONCE at session start: "This crosses §1 + §2. Anchoring at §X for bulk; will flag §Y crossover." |
| **C** | Truly novel domain (≤30% signal match) | Surface ONCE: "(a) Use §1+§2 as proxy, (b) propose §N, (c) skip advisor for this session." 30s default → (c). |
| **D** | Same-session pivot detected (e.g., started §1, started touching §2 files) | Auto-detect via file-watchlist. Quietly switch section. Note in session. |
| **E** | Multi-type work (e.g., promo codes = billing + growth) | Surface ALL applicable skills, not just first match. **CASE E supersedes CASE B when both apply** — multi-type is broader. |
| **F** | Read-only / exploration / Q&A | Skip advisor entirely. |

---

## Loop-Prevention Layer (L1-L5)

**Purpose:** Prevent the cascading-remediation failure mode (fix A → break B → fix B → break C → loop). Applies across ALL work-types and sections.

| ID | Mechanism | Rule | Triggers when |
|---|---|---|---|
| **L1** | **Goal anchor** | At session start, declare the ONE goal in one sentence. Pinned at top of context. Every skill invocation must demonstrably serve it. | Always — declared at session open |
| **L2** | **Invocation budget** | Max **2 MUTATING skill invocations per single goal**. Third mutating invocation requires explicit founder `--continue-chain` permission. **EXCEPTION:** read-only/planning skills do NOT count against budget — `brainstorming`, `spec`, `writing-plans`, `code-review`, `design-review`, `verification-before-completion`, `investigate`, `browse`, `qa-only`, `health`. Only mutating/deploying skills count: `ship`, `deploy`, `careful`, `freeze`, `autoplan` (when it edits), migrations, etc. | When attempting MUTATING skill invocation #3 in same goal-chain |
| **L3** | **Regression detection** | Each invocation declares preconditions ("what currently works") + postconditions ("what should work after"). If a previously-passing precondition now fails → **immediate rollback**, NOT chain forward. | When postcondition fails OR precondition regresses |
| **L4** | **Scope-creep alarm** | Track files touched per session. If file-set grows beyond ~8 files OR crosses a section boundary mid-session → pause and surface. | When file-touch count exceeds threshold OR boundary crossed |
| **L5** | **Cycle detection** | If same skill invoked twice for same goal OR pattern A→B→A emerges → **abort and surface**. Don't invoke a third. | When repetition pattern detected |

---

## Rationalization tripwires

The most subtle failure mode is **agents rationalizing past the rules**. The advisor catches this by maintaining a verbatim list of rationalization phrases that trigger STOP.

| Verbatim red-flag phrase | What it means | Counter-rule |
|---|---|---|
| *"There's no row for that, I'll just lean on what fires"* | Anchor bias (Pattern 1) | List ALL work-types FIRST. Match each separately. |
| *"It's a small CSS tweak — anti-pattern says don't suggest skills for trivial actions"* | Trivial-action misfire (Pattern 2) | Quality-judgment phrasing overrides triviality. Surface design skill anyway. |
| *"This skill is in the inventory but not the trigger table, so I shouldn't surface it"* | Closed-world assumption (Pattern 3) | Trigger tables are GUIDANCE, not whitelist. Surface anyway + propose adding. |
| *"I'll just fix this quickly while I'm here"* | Loop-creep onset (L4 violation) | STOP. Park the unrelated finding. Return to L1 goal. |
| *"One more skill should do it"* | Invocation budget violation (L2) | STOP. Surface to founder for `--continue-chain` permission. |
| *"It's related so I should chain"* | Loop-creep rationalization | STOP. The chain itself is the warning. |

**These phrases are deliberately VERBATIM.** They're the actual rationalizations observed in baseline TDD testing. Listing them in this canonical form means an agent self-detecting the phrase can trip the rule before completing the rationalization.

---

## Open-world rule

The skill inventory is **180+ skills** across gstack, Vercel, superpowers, claude-md-management, postman, hf-skills, frontend-design, and others. The trigger tables in any profile are **GUIDANCE, not an exhaustive whitelist**.

When you encounter work that fits a skill outside the trigger table:

1. Surface the skill anyway with the standard format
2. Note: "Skill not in trigger table — proposing addition: <work-type> → `<skill-name>`"
3. If the user accepts the suggestion, the trigger gets added to the table in the next edit cycle

This rule is critical for the standalone product because users will install plugins the advisor doesn't yet know about. Open-world default + community contribution model = the advisor stays useful across the ecosystem's evolution.

---

## Quality-judgment override

**Anti-pattern this addresses:** users describing visual polish with quality-judgment phrases ("make this feel premium", "give it a $200/mo polish") have their request silently classified as "trivial CSS change" → no design skill fires.

**Rule:** If the user's request contains any of these phrasing patterns, **the trivial-action skip is OVERRIDDEN**. Design skills surface regardless of code-LOC change size:

- "premium" / "feels premium" / "make it feel premium"
- "polish" / "polished" / "needs polish"
- "elevated" / "sophisticated" / "high-end"
- "$X/mo product" / "$X/mo feel" / "belongs in a $X product"
- "luxury" / "design-forward" / "design-led"
- "feels like" + qualifier (e.g., "feels like a $200/mo product", "feels enterprise")

This list is **extensible**. New quality-judgment phrasings get added as they're encountered in real work.

---

## Format conventions for suggestions

When the advisor surfaces a suggestion, it MUST use one of these exact formats:

```
**Skill suggestion:** `<skill-name>` — `<what it would do here>`. Want me to invoke it?
```

For risk moments:

```
**Risk flag:** about to `<destructive action>`. `<skill-name>` would `<safety mechanism>`. Recommend invoking first.
```

For cross-section coordination:

```
**Cross-section flag:** this work spans §1 + §2. Anchoring at `<section>`; will surface crossover when reached.
```

**Communication discipline:**
- Lead with the heading so users can scan for it
- ONE sentence per suggestion: name the skill, name the value
- Always ask permission; **NEVER auto-invoke a non-readonly skill without confirmation**
- If declined or ignored, do NOT repeat the same suggestion in the same session
- Don't stack suggestions: surface ONE at a time at the most-relevant moment

---

## Section structure (v0 the dogfood project example)

The v0 dogfooding instance organizes triggers into two sections:

- **§1 Core Engine** — 17 trigger rows (billing, auth, security, CI, launch, ops disciplines)
- **§2 Design + Brand** — 13 trigger rows (brainstorming, design-shotgun, frontend-design, design-review, browse, shadcn, etc.)

**Future (standalone product):** Sections become user-defined per-project profiles. Common defaults can ship (Core Engine, Design + Brand, Growth + Marketing, Operations) but users curate their own.

---

## Extensibility

**Adding a new section:** When a session encounters work that doesn't fit any existing section cleanly (CASE C), it surfaces the choice to add a new §N. Founder approves; that session drafts §N with 5-15 trigger rows + appends below existing sections. Other active sessions are briefed via paste-ready prompt pattern.

**Adding a trigger row to an existing section:** When a useful skill is missing from the trigger table (open-world rule fires), the session surfaces the skill + proposes adding the row. Founder approves; row gets added at the next edit cycle.

**Adding a quality-judgment phrase:** When a new phrasing pattern is observed in real work that quality-judgment-override SHOULD fire on but doesn't yet, the session proposes adding the pattern to the list.

---

## Sunset condition

If a user repeatedly declines suggestions over 2+ sessions OR explicitly says "stop suggesting skills":

- Dial down to skill suggestions only when a CRITICAL risk applies (destructive prod ops, billing surface, security issue)
- Continue Loop-Prevention Layer (L1-L5) regardless — those are not advisory, they're safety

---

## Validation history

| Date | Phase | Outcome |
|---|---|---|
| 2026-06-01 | RED — baseline test with `superpowers:writing-skills` | 3 failure patterns surfaced (anchor bias, trivial-action misfire, closed-world assumption) |
| 2026-06-01 | GREEN — restructured with rationalization table + loop-prevention layer | Deployed |
| 2026-06-01 | REFACTOR re-test (3 RED scenarios + 1 loop temptation) | **ALL 4 PASS** |
| 2026-06-01 | Inline gap fixes (CASE E precedence, L2 read-only exception, Signal 0 Pricing-Model) | Applied |
| TBD | First real-work pilot (sign-in page mockup) | Running in parallel session |

---

*See [`TESTING_PROTOCOL.md`](TESTING_PROTOCOL.md) for the full TDD methodology + baseline scenarios + verification approach.*
