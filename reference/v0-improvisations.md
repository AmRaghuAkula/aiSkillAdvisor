# Skill Advisor — Improvisations Log (Reference Copy)

> **⚠ SOURCE OF TRUTH:** The live, mutable improvisations log lives at:
> `~/.claude/projects/<your-project-slug>/memory/skill_advisor_improvisations.md (in the maintainer's local Claude Code environment)`
>
> This file is a **frozen reference snapshot** last updated 2026-06-02 (initial capture 2026-06-01). Edits to the improvisations log happen in the memory directory during the dogfood project dogfooding; this reference file is updated periodically via consolidated PR (per founder's plan).

---

## Purpose

Every time we improvise or refine the Skill Advisor during the dogfood project dogfooding, the change gets logged here. This log **IS the v1 changelog** when we eventually extract the standalone product.

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
- **Generalizable?** YES — all of the above is universal pattern, not the dogfood project-specific.
- **Standalone-spec implication:** This is the core algorithm. Everything in the standalone v1 is built on this foundation.

## 2026-06-01 — REFACTOR gap fixes

- **Trigger:** GREEN re-test surfaced 3 minor gaps: CASE E/B precedence ambiguity; L2 budget too tight for read-only/planning skill chains; Signal 0 repo list missing the dogfood project-Pricing-Model.
- **Change:** (1) CASE E supersedes CASE B when both apply — multi-type is broader, cross-section is its subset. (2) L2 budget excludes read-only/planning skills (`brainstorming`, `spec`, `writing-plans`, `code-review`, `design-review`, `verification-before-completion`, `investigate`, `browse`, `qa-only`, `health`); only mutating/deploying skills count. (3) Signal 0 adds `the dogfood project-Pricing-Model` to in-scope repos.
- **Generalizable?** YES for (1) and (2). (3) is the dogfood project-specific path, but the *pattern* (Signal 0 enumerates in-scope project roots) is generic.
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

## 2026-06-02 — Plugin install mechanism reverse-engineered + legal plugin installed manually

- **Trigger:** Founder pushback (verbatim): *"the whole point of having Skill Advisor is that I'm a non-technical person, so I have no clue how to install this plug-in. You need to find a creative way to make it happen."* "Ask the human to install" defeats the purpose of an advisor for non-tech users.
- **Discovery:** Inspecting `~/.claude/plugins/` showed the install pattern is reproducible without the `claude` CLI: (1) `known_marketplaces.json` lists registered marketplaces (each = a GitHub repo); (2) `marketplaces/<name>/` is a git clone of the marketplace; (3) `cache/<marketplace>/<plugin>/<version>/` holds installed plugin files; (4) `installed_plugins.json` tracks what's installed.
- **Action:** Installed `anthropics/knowledge-work-plugins/legal@1.2.0` manually (clone marketplace → copy plugin to cache → register in both JSON files). 9 legal skills became visible — including **review-contract**.
- **Critical candidate — F11: on-demand plugin install.** When the advisor identifies a needed-but-uninstalled skill, it must INSTALL it (with permission), not punt to the human. This is the closing motion the standalone product must own.
- **Generalizable?** YES — F11 is THE missing capability for non-tech users. Without it, the advisor is a routing layer with no closing motion.
- **Standalone-spec implication:** F11 ships in v1; it's a precondition for F1 (auto-sweep) being useful and pairs with F10's "fetch from URL" as the install backend.

## 2026-06-02 — F11 install motion is 5 steps + restart, NOT 4 (silent-failure discovery)

- **Trigger:** Post-restart, `Skill(legal:review-contract)` returned `Unknown skill` despite the "manual install" above. The plugin *looked* installed.
- **Diagnosis (files read line-by-line):** `installed_plugins.json` ✅ registered, `known_marketplaces.json` ✅ present, cache dir ✅ all 9 `SKILL.md` files on disk, `marketplace.json` ✅ lists the plugin — but **`enabledPlugins` in `settings.json` was MISSING the entry** ← root cause.
- **Root cause:** the "4-step install pattern" above is **incomplete**. The real motion is **5 steps**: clone marketplace → copy to cache → add to `known_marketplaces.json` → add to `installed_plugins.json` → **add `"<plugin>@<marketplace>": true` to `enabledPlugins` in `settings.json`** — AND THEN a **session restart** is required (plugin skill discovery happens once at harness startup; no mid-session hot-load).
- **Worst failure mode for non-tech users: it's SILENT.** Every artifact says "installed"; nothing tells the user the skill can't run. Exactly the trap aiSkillAdvisor exists to prevent.
- **✅ FIX VALIDATED:** after adding the `enabledPlugins` entry + restart, all 9 legal commands resolved in the slash-command menu (confirmed by founder screenshot), and `/review-contract` ran end-to-end (see next entry). The 5-step+restart motion is now empirically proven.
- **Generalizable?** YES — rewrites F11's spec.
- **Standalone-spec implication:** F11's install routine MUST (a) write the `enabledPlugins` flag, not just register + copy; (b) **detect a restart is required and say so in plain language**; (c) ideally **verify post-restart** the skill resolves, surfacing a clear failure instead of a false "installed." A silently-ignored install is worse than no install. This becomes F11's acceptance criteria.

## 2026-06-02 — /review-contract dogfood: legal plugin ran for real + improved LICENSING.md

- **Trigger:** Run the *real* `/review-contract` (replacing a prior Agent-substitute approximation) against `aiSkillAdvisor/LICENSING.md`, now that the F11 `enabledPlugins` fix + restart landed.
- **Outcome (F11 validation):** `knowledge-work-plugins/legal:review-contract` **resolved and executed end-to-end** — second confirmation of the 5-step+restart motion. The skill gathered context (which side / review goal), loaded both LICENSING.md + the operative LICENSE, and produced a clause-by-clause review with severity tiers.
- **What the review flagged (7 findings):**
  - **2 RED** — (1) "commercial use" defined by *revenue* in the headline contradicted the edge-case table (for-profit internal tooling = commercial regardless of revenue) AND was narrower than PolyForm's permission model (anything not a permitted purpose is simply *unlicensed*); (2) "Polyform grants are irrevocable" overstated the LICENSE, which terminates on violation (32-day cure) + patent assertion — estoppel risk.
  - **4 YELLOW** — response-time self-contradiction (24h vs "within a week"); no as-is/no-warranty pointer in the explainer; "Evaluation" loophole for commercial evaluators; confusing "No SaaS-clone protection" label.
  - **1 DECISION** — PolyForm's Patent License grants every non-commercial user a patent license (interacts with the "patented engine" USP); flagged, no wording change.
- **What changed in LICENSING.md:** 6 wording edits (both REDs + all 4 YELLOWs). License choice **unchanged** (PolyForm Noncommercial 1.0.0). The conflict rule ("LICENSE governs") was the load-bearing protection keeping the YELLOWs from being REDs.
- **Generalizable?** YES. The §1 "About to change LICENSE/contracts → `legal:review-contract` + external counsel" trigger row is now **validated on real work** — it fired, the skill ran, the artifact improved. Confirms the domain-expertise-gap pattern: AI review caught the structural ~80%; the doc still carries a "qualified counsel before commercial execution" caveat for the rest.
- **Standalone-spec implication:** the legal-review routing row graduates from candidate to **validated default**. The trusted-source registry (F10) must include `anthropics/knowledge-work-plugins` so the legal plugin is discoverable + installable (F11) without hand-installing.

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
| TBD | sign-in page mockup pilot (in progress) | TBD | TBD | TBD |
| TBD | Pilot 2 (/404 error page mockup) | TBD | TBD | TBD |
| TBD | First non-the dogfood project session | TBD | TBD | Tests cross-project generalizability |

---

## Related (in the dogfood project memory)

- `feedback_proactive_skill_advisor.md` — the live v0 memory file
- `project_skill_advisor_vision.md` — the standalone-product vision
- `feedback_design_session_scope_only.md` — scope rule complementing the advisor
- `feedback_fix_audit_protocol.md` — discipline that motivated the confidence-level rules

---

*Discipline reminder: any change to the Skill Advisor v0 gets a log entry here. No silent edits. This file IS the v1 changelog.*
