# aiSkillAdvisor — Handoff from v0 Dogfooding

**Date of handoff:** 2026-06-01
**Handoff author:** Claude session working on the dogfood project design
**Recipient:** future parallel Claude sessions + community contributors picking up this repo

---

## What is this document?

This document captures the **state of work** for the aiSkillAdvisor project as of 2026-06-01. The v0 of the advisor was designed and validated inside a the dogfood project Claude Code session over ~2 hours of focused TDD work. That v0 is now being dogfooded on real the dogfood project rebrand work. This repo is the **extraction point** for the standalone product.

Read this document **first** if you're picking up the aiSkillAdvisor project for the first time. It's the fastest path to understanding what's been done, what's next, and what NOT to do.

---

## TL;DR

| Item | Status |
|---|---|
| Skill Advisor algorithm | ✅ Designed, TDD-validated, deployed as v0 |
| the dogfood project dogfooding | 🟡 In active use; logging refinements |
| Standalone product extraction | ⏳ Not started — waiting for 3+ pilot validations |
| First real pilot (Pilot 1 (sign-in mockup)) | 🟡 In progress in a parallel session |
| Repository | ✅ Public, PolyForm Noncommercial 1.0.0 (fair-source), README + handoff docs in place |
| Roadmap | ✅ Captured in PRODUCT_VISION.md + BACKLOG.md |

**Don't start v1 extraction yet.** Per the founder's explicit instruction (2026-06-01), the standalone product gets built only after 2-3 successful the dogfood project pilots validate the discipline in real work. Extracting prematurely risks shipping an unvalidated product.

---

## What's been done (v0 — completed)

### 1. Algorithm design + TDD validation

The Skill Advisor v0 was designed using the `superpowers:writing-skills` discipline — a TDD methodology for skill creation. The cycle:

- **RED phase** — ran a baseline pressure test with a fresh subagent against 3 session scenarios using the THEN-current proactive-skill-advisor memory (17 trigger rows, no routing logic). 3 failure patterns surfaced verbatim:
  - Pattern 1: Anchor-on-known-trigger bias (multi-domain work routes to first match only)
  - Pattern 2: Trivial-action anti-pattern misfires on design polish ("just CSS" skips advisor entirely)
  - Pattern 3: Closed-world assumption (skills outside the table never surface)

- **GREEN phase** — restructured the memory with: Signal-based routing (0/1/2), work-type classification, Loop-Prevention Layer L1-L5, rationalization tripwires with verbatim red-flag phrases, open-world rule, quality-judgment override, CASE A-F routing.

- **REFACTOR phase** — re-ran same 3 scenarios + 1 new loop-temptation scenario. ALL 4 PASSED. 3 minor gaps surfaced and fixed inline.

See [`TESTING_PROTOCOL.md`](TESTING_PROTOCOL.md) for the full methodology + baseline scenarios.

### 2. Algorithm components built into v0

All of the following are documented in [`ARCHITECTURE.md`](ARCHITECTURE.md):

- **Signal 0** — Repo root check (advisor only applies in known project roots)
- **Signal 1** — File paths matching to section assignment
- **Signal 2** — Keywords + work-type classification (data/financials, visual/brand, security, perf, growth, ambiguous, etc.)
- **Routing cases A-F** — Auto-route / cross-section / novel domain / pivot / multi-type / read-only
- **Loop-Prevention Layer L1-L5** — Goal anchor, invocation budget (mutating skills only), regression detection, scope-creep alarm, cycle detection
- **Red-flag phrases** — Verbatim rationalization quotes that trigger STOP
- **Rationalization table** — 3 baseline failure patterns with explicit counter-rules
- **Open-world rule** — Trigger tables are guidance, not whitelist
- **Quality-judgment override** — "Premium", "feels like", "polish" phrases override trivial-action skip

### 3. Two-section the dogfood project-specific routing

The v0 instance on the dogfood project has two sections:
- **§1 Core Engine** — 17 trigger rows from the original proactive advisor (billing, auth, security, CI, launch)
- **§2 Design + Brand** — 13 new trigger rows for design/beautification work

These sections are the dogfood project-specific. In the standalone product, sections become **configurable per-project profiles**.

### 4. Cross-session coordination patterns

The v0 is dogfooded across multiple Claude sessions (design + core-engine + pilot). Paste-ready briefing prompts were developed to keep all sessions aligned on the same advisor + scope rules. See `reference/v0-skill-advisor.md` for the live discipline.

---

## What's currently in progress

| Workstream | Owner | Status |
|---|---|---|
| the dogfood project v0 dogfooding | the dogfood project design session | 🟡 Ongoing — every refinement logged in `reference/v0-improvisations.md` |
| Pilot 1 (sign-in mockup) pilot | Parallel pilot session | 🟡 First real-work validation — should produce first pilot data row |
| aiSkillAdvisor handoff bundle | THIS session | ✅ Complete (you're reading it) |

---

## What's NEXT (in priority order)

### Phase 0 — Dogfood + validate (we are here)

Run 2-3 real the dogfood project pilots with the v0 active. Each pilot:
- Declares an L1 goal anchor at session start
- Watches for advisor firings during work
- Logs refinements to `skill_advisor_improvisations.md`
- Reports pilot-results data row in the improvisations memory

**Decision gate:** after 3 successful pilots, evaluate whether to proceed to Phase 1.

### Phase 1 — Extract abstraction (only after Phase 0 succeeds)

Pull the dogfood project-specific bits out of the algorithm:
- §1/§2 trigger tables become **configurable per-project profiles**
- Specific file paths become **profile-defined glob patterns**
- Specific keywords become **profile-defined keyword lists**
- The core algorithm (signals, cases, L1-L5, tripwires) stays universal

Target: a clean separation between **engine** (universal) and **profile** (per-project).

### Phase 2 — Manifest format + auto-discovery

- Define YAML/JSON schema for skill manifests (see [`prototypes/manifest-schema-draft.yaml`](../prototypes/manifest-schema-draft.yaml))
- Build auto-discovery for installed Claude Code plugins (gstack, vercel, superpowers, etc.)
- Pre-populate the manifest from discovered skills

### Phase 3 — Plain-language output layer

Translate technical output ("Skill suggestion: `superpowers:writing-plans`") into non-technical phrasing ("I'd suggest planning this before you code. Want me to set up the plan?"). Critical for the target user persona.

### Phase 4 — Configuration UX

Make it easy for non-technical users to:
- Add their own skills without writing YAML by hand
- Curate project profiles via simple commands
- Update or disable trigger rows

### Phase 5 — Packaging + distribution

- Publish to npm / Claude Code plugin registry
- Documentation site (non-technical-friendly walkthrough)
- Example projects

### Phase 6 — Multi-platform

Extend to Cursor, Continue, Aider — same advisor logic, different integration layer.

---

## What NOT to do

Per the founder's explicit instructions and per the v0 discipline:

| Anti-pattern | Why to avoid |
|---|---|
| **Don't start v1 extraction before 3 pilot validations** | We have a paper design that passed synthetic tests but ZERO real-work evidence. Premature extraction risks building the wrong abstraction. |
| **Don't touch the live the dogfood project v0 memory file from this repo** | The file at `~/.claude/projects/<project>/memory/feedback_proactive_skill_advisor.md` is the LIVE instance. This repo holds COPIES for handoff context. Edits to v0 happen in the memory directory; this repo logs them after the fact. |
| **Don't add features the v0 doesn't have yet** | The standalone product should be the v0 abstraction first, additions second. If a feature didn't exist in dogfooding, it hasn't been validated. |
| **Don't pivot scope without founder approval** | The founder explicitly anchored this as "non-technical AI enthusiasts" focus. Don't broaden to "all builders" without explicit re-anchor. |
| **Don't merge contributions before v0.5** | Per README — open Issues yes, PRs no, until v0.5 is reached |

---

## Key files in this repo

| File | What it contains |
|---|---|
| [`README.md`](../README.md) | Public-facing project description, target user, capabilities, contribution model |
| [`docs/HANDOFF.md`](HANDOFF.md) | This file |
| [`docs/PRODUCT_VISION.md`](PRODUCT_VISION.md) | Full vision, sequencing rules, decision gates |
| [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | Algorithm spec — signals, cases, L1-L5, tripwires |
| [`docs/TESTING_PROTOCOL.md`](TESTING_PROTOCOL.md) | TDD methodology + 4 baseline scenarios + verification |
| [`docs/BACKLOG.md`](BACKLOG.md) | Candidate improvements + open questions |
| [`reference/v0-skill-advisor.md`](../reference/v0-skill-advisor.md) | Copy of the live v0 memory (source of truth pointer included) |
| [`reference/v0-improvisations.md`](../reference/v0-improvisations.md) | Change log from the dogfood project dogfooding (the v1 changelog) |
| [`prototypes/manifest-schema-draft.yaml`](../prototypes/manifest-schema-draft.yaml) | Proposed YAML schema for configurable skills |

---

## Live source-of-truth pointers

The aiSkillAdvisor repo holds documentation copies. The **live, mutable** v0 lives in the the dogfood project session's memory directory:

```
SOURCE OF TRUTH (do not edit from this repo):
  ~/.claude/projects/<your-project-slug>/memory/
    ├── feedback_proactive_skill_advisor.md   # The live Skill Advisor v0
    ├── project_skill_advisor_vision.md       # The standalone-product vision
    └── skill_advisor_improvisations.md       # Change log (becomes v1 changelog)
```

When refinements happen during the dogfood project work:
1. They're applied to the memory directory v0 first
2. They're logged in `skill_advisor_improvisations.md`
3. Periodically, the improvisations are batched into this repo via consolidated PR (per founder's plan)

This pattern keeps the live discipline reliable while preserving a clean public-facing repo.

---

## Propagation discipline (how we keep the repo in sync with the live v0)

**The gap (honest disclosure):** today, sync between the live v0 (in the maintainer's Claude Code memory directory) and this repo's `reference/` files is **manual**. There's no automation. Refinements made to v0 during dogfooding don't auto-propagate to `reference/v0-skill-advisor.md` or `reference/v0-improvisations.md`. This means the reference files can lag behind the live v0 by days or weeks.

**Why this matters:** a contributor reading the repo cold expects `reference/` files to reflect the current state of v0. If they're stale, the contributor's mental model is wrong.

### Current discipline (manual)

Every time the live v0 is refined OR the improvisations log gets a new entry:

1. **In the live v0 location:** apply the edit. Per "no silent edits" rule (top of `skill_advisor_improvisations.md`), log the change in the improvisations log immediately.
2. **In this repo:** within the same session OR at the next commit cycle, mirror the change in `reference/v0-skill-advisor.md` and `reference/v0-improvisations.md`. Commit message format: `docs(sync): mirror v0 refinement <short title>`.

### Failure mode this is vulnerable to

If a session forgets step 2, the reference files silently drift. There's currently no validator that catches this.

### Mitigations in scope for v1 standalone product (see [`BACKLOG.md`](BACKLOG.md) CF items)

| Mitigation | Status | Notes |
|---|---|---|
| **Sync checklist** in every session-end | ✅ Documented (you're reading it) | Manual; relies on discipline |
| **Sync script** (`scripts/sync-from-v0.sh`) | ❌ Not yet built | Would copy from `$LIVE_V0_PATH` → `reference/` on demand. Needs env var for live v0 path. Carry-forward item. |
| **Pre-commit hook** that fails if `reference/` is older than the live v0 | ❌ Not yet built | Strongest enforcement; v1.x or v2 work |
| **CI check** that diffs `reference/` against a known-good snapshot | ❌ Not yet built | Catches drift in PR review |

### What contributors should know

- The `reference/` files **may lag behind the live v0** by up to ~1-2 weeks during active dogfooding
- The live v0 is the source of truth; `reference/` is documentation
- If a contributor finds drift between `reference/` and the live v0, opening an Issue (or PR with a sync commit) is welcomed
- The `skill_advisor_improvisations.md` change log is the strongest signal of what's changed since the last sync — its "applied date" entries are timestamps for new refinements

---

## Contact + ownership

| Role | Person |
|---|---|
| Maintainer | [@AmRaghuAkula](https://github.com/AmRaghuAkula) |
| Founder vision | Captured 2026-06-01 — see PRODUCT_VISION.md |
| Issues | Use GitHub Issues — not yet accepting PRs (per README) |

---

*If you're a Claude session picking this up, your next step is to read PRODUCT_VISION.md and ARCHITECTURE.md, then check BACKLOG.md for what to work on next.*
