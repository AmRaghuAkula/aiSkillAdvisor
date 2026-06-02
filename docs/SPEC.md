# aiSkillAdvisor — v1 Specification

**Version:** 1.0.0-spec
**Status:** Ready for implementation
**Date:** 2026-06-01
**Audience:** Engineers starting the v1 coding session

> This document specifies the **concrete shape of v1**: CLI commands, file formats, install flow, runtime requirements, module API contracts, privacy guarantees, and versioning. It assumes you have already read [`PRODUCT_VISION.md`](./PRODUCT_VISION.md) and [`ARCHITECTURE.md`](./ARCHITECTURE.md). Algorithm details (Signal 0/1/2, Cases A–F, L1–L5) are NOT repeated here — see ARCHITECTURE.md.

## Confidence legend (per Agent-1 brainstorming recommendation)

Each section below carries a confidence tag:
- **🟢 Locked** — based on v0 evidence + founder direction; safe to implement
- **🟡 Strawman** — reasonable default but needs validation in v0.5-v1.0 dogfooding
- **🔴 Speculative** — best guess; expect to revise after first 2-3 v0 pilots produce more data

---

## 0. Scope of v1 🟢 Locked

v1 ships the **minimum viable advisor** that a non-technical builder can install, onboard, and use across at least one project, with the full ARCHITECTURE.md routing algorithm running locally. It includes:

- F1 (auto-sweep), F2 (one-command install), F3 (onboarding wizard), F4 (dry-run), F5 (acceptance learning), F6 (status), F7 (privacy/local-first), F9 (cost/time awareness)
- Onboarding sub-features O1, O2, O3, O6, O7, O8, O9 (O4 deferred per BACKLOG.md downgrade, O5 conditional, O10 deferred)
- Pilot 1 generalizations: P1 (`precondition` field), P2 (static-server detector), P3 (match-vs-generate semantic)
- Single platform: **Claude Code**. Multi-platform (Cursor/Continue/Aider) is Phase 6.

**Explicit NOT in v1** (per Agent-1 recommendation):
- F8 (skill recipes / playbooks)
- Telemetry/analytics backend
- GUI (CLI + Claude Code integration only)
- Manifest registry/marketplace
- Remote sync between machines
- Multi-user / team accounts
- Encryption at rest (v1.5 candidate)

---

## 1. CLI commands 🟢 Locked

The binary is `aiskill-advisor` (and short alias `asa`). All commands accept `--help`, `--json` (machine-readable output), `--verbose`, and `--quiet`. Default output is human-readable.

### Global conventions

- **Exit codes:**
  - `0` — success
  - `1` — generic failure (unexpected error)
  - `2` — usage error (bad flag, missing arg)
  - `3` — config error (manifest invalid, profile missing)
  - `4` — precondition failed (e.g., Signal 0 mismatch when one was expected)
  - `5` — user declined / interactive cancel
  - `10` — first-run required (`init` not yet run)
- **Config root:** `~/.aiskill-advisor/` on macOS/Linux, `%USERPROFILE%\.aiskill-advisor\` on Windows. We refer to this as `$ASA_HOME` throughout.
- **No network calls** without explicit user opt-in. All commands are local-first.

### 1.1 `aiskill-advisor init`

First-time setup. Runs onboarding wizard (F3) and creates the user's profile + manifest.

```
aiskill-advisor init [--profile-template <name>] [--skip-sweep] [--non-interactive] [--force]
```

**Flags:**
- `--profile-template <name>` — start from a persona template (O3/O9). Valid: `solo-founder`, `designer-who-codes`, `pm-in-tech`, `indie-hacker`, `hobbyist`. Default: prompt.
- `--skip-sweep` — skip auto-discovery during init; user can run `sweep` later.
- `--non-interactive` — assume defaults; write minimal profile. For CI / scripted setup.
- `--force` — overwrite existing config in `$ASA_HOME`. Without this, refuses if `$ASA_HOME/manifest.yaml` exists.

**Side effects:**
- `$ASA_HOME/onboard-guidelines.md`
- `$ASA_HOME/manifest.yaml`
- `$ASA_HOME/history.jsonl` (empty)
- `$ASA_HOME/config.json`
- `$ASA_HOME/onboarding-transcript.md` (O10)

**Sample output:**

```
$ aiskill-advisor init
aiSkillAdvisor — first-time setup

[1/8] What best describes you?
  > Solo founder building a SaaS
    Designer shipping code with AI
    Product manager directing agents
    Indie hacker / generalist
    Hobbyist / AI enthusiast
    I'd rather start blank

[2/8] Pick the kind of task you do most often (show, don't ask):
  > [A] Add a checkout flow to my app
    [B] Polish the look of my landing page
    [C] Investigate why my deploy is slow
    [D] Plan a 3-week feature rollout

[3/8] Where do you keep your projects? (drag a folder, or paste a path)
  > ~/Projects/MyProject

... (8 questions total — 3 required + 5 recommended, all skippable)

Preview of your guidelines:
  ────────────────────────────────────────────────
  • You're a solo founder, primarily shipping product features
  • aiSkillAdvisor will suggest `cso` before billing PRs
  • It will NOT suggest `ios-design-review` (you build web)
  • It will lean toward `design-review` when you say "feels premium"
  ────────────────────────────────────────────────
  Edit these? [y/N]

Sweeping for installed skills... found 47 (gstack: 28, vercel: 12, superpowers: 7)
  Review the list? [Y/n]

Setup complete. Try:
  aiskill-advisor dry-run "I want to add a promo code system"
```

**Exit codes:** 0 (success), 2 (bad flag), 5 (user cancelled), 10 (re-running without `--force`).

### 1.2 `aiskill-advisor sweep`

Auto-discovery of installed skills (F1).

```
aiskill-advisor sweep [--ecosystem <name>...] [--dry-run] [--accept-all] [--reject-all]
```

**Flags:**
- `--ecosystem <name>...` — restrict scan. Valid: `gstack`, `vercel`, `superpowers`, `claude-md-management`, `postman`, `huggingface-skills`, `frontend-design`. Default: all known.
- `--dry-run` — show what would be added without modifying.
- `--accept-all` — skip per-skill review.
- `--reject-all` — show diff + exit; non-zero if new skills found.

**Side effects:** Updates `$ASA_HOME/manifest.yaml`'s `skills:`. Backs up to `manifest.yaml.bak` first.

**Sample output:**

```
$ aiskill-advisor sweep --ecosystem gstack
Scanning ~/.claude/plugins/gstack/...

Found 28 skills. 3 are new since last sweep:
  + gstack:landing-report   — read-only queue dashboard for workspace-aware ship
  + gstack:retro            — weekly engineering retrospective
  + gstack:skillify         — codify a /scrape flow into a permanent browser-skill

Accept all? [Y/n/select]
> select

  [1/3] Accept `gstack:landing-report`? [Y/n/edit] y
  [2/3] Accept `gstack:retro`? [Y/n/edit] y
  [3/3] Accept `gstack:skillify`? [Y/n/edit] n   (skipped)

Manifest updated. 2 skills added. Backup at $ASA_HOME/manifest.yaml.bak
```

**Exit codes:** 0, 1 (scan failed), 3 (manifest invalid), 5 (cancelled).

### 1.3 `aiskill-advisor dry-run "<prompt>"`

Show what skills would fire without invoking (F4).

```
aiskill-advisor dry-run "<prompt>" [--cwd <path>] [--files <glob>...] [--explain] [--json]
```

**Flags:**
- `--cwd <path>` — simulate running from a specific directory.
- `--files <glob>...` — declare files user expects to touch. Else inferred.
- `--explain` — show full routing trace.
- `--json` — machine-readable.

**Side effects: NONE.** Read-only. No history.jsonl write.

**Sample output:**

```
$ aiskill-advisor dry-run "I want to add a promo code system to checkout"
Routing trace:
  Signal 0 (repo root): ✓ matched (my-project project)
  Signal 1 (file paths): inferred — src/lib/billing/**, src/app/api/checkout/**
  Signal 2 (work-types): data/financials + growth/loyalty/abuse + spec-ambiguous
  Routing case: E (multi-type)

Suggestions (3):
  1. superpowers:brainstorming
     — "let's brainstorm" / ambiguous-scope; clarify before code
     cost: ~2 min, ~$0.10 LLM
  2. gstack:cso
     — billing surface touched; security review pre-merge
     cost: ~5 min, ~$0.40 LLM
  3. (propose) growth/marketing section
     — no §3 in current profile; promo flow suggests adding one
     cost: setup only

Loop-prevention pre-checks: L1 goal anchor missing (declare it before invoking any mutating skill).

This was a dry run. No skills were invoked. No history was written.
```

**Exit codes:** 0 (suggestions found), 4 (Signal 0 mismatch), 2 (bad flag).

### 1.4 `aiskill-advisor status`

Skill ledger / dashboard (F6).

```
aiskill-advisor status [--period <7d|30d|all>] [--ecosystem <name>] [--stale] [--json]
```

**Side effects: NONE.** Read-only.

**Sample output:**

```
$ aiskill-advisor status --period 30d
aiSkillAdvisor — ledger for 2026-05-02 → 2026-06-01

Registered skills:        47 (gstack: 28, vercel: 12, superpowers: 7)
Active profiles:          2 (my-project, founderassist)
Suggestions surfaced:     63
Accepted:                 41 (65%)
Declined:                 22 (35%)
Sunset (per-context):      3 (cso in my-project/design-brand, ...)

Top 5 most-fired skills (last 30d):
  1. gstack:cso              14 fires, 12 accepted (86%)
  2. superpowers:brainstorming 11 fires, 11 accepted (100%)
  3. gstack:design-review     9 fires,  6 accepted (67%)
  4. gstack:ship              7 fires,  7 accepted (100%)
  5. gstack:health            5 fires,  3 accepted (60%)

Stale (never fired in last 30d): 19 skills
  Run `aiskill-advisor status --stale` to list them.
```

**Exit codes:** 0, 3 (history unreadable).

### 1.5 `aiskill-advisor add-skill <skill-yaml>`

Manually register a skill.

```
aiskill-advisor add-skill <path-to-yaml> [--project <id>] [--validate-only]
aiskill-advisor add-skill --interactive
```

**Side effects:** Appends to `$ASA_HOME/manifest.yaml`. Creates `.bak` first.

**Exit codes:** 0 (added), 2, 3 (schema invalid), 5 (cancelled).

### 1.6 `aiskill-advisor profile <subcommand>`

```
aiskill-advisor profile show [--project <id>]
aiskill-advisor profile edit [--project <id>] [--editor <cmd>]
aiskill-advisor profile swap <persona-name>
aiskill-advisor profile list
aiskill-advisor profile export <path>
aiskill-advisor profile import <path>
```

- `show`/`list`/`export` are read-only.
- `edit`/`swap`/`import` mutate config. Backups created.
- `swap` backs up old to `onboard-guidelines.md.bak.<timestamp>`.

### 1.7 `aiskill-advisor route` (internal — invoked by Claude Code)

Runtime entry point. Used by integration; documented for testability.

```
aiskill-advisor route --prompt "<prompt>" --cwd <path> [--files <glob>...] [--session-id <id>] [--json]
```

**Side effects:** Appends to `$ASA_HOME/history.jsonl`. Read-only against manifest + profile.

### 1.8 `aiskill-advisor pause` / `resume` / `mute` (kill-switch UX — per Agent-1 recommendation) 🟡 Strawman

```
aiskill-advisor pause [--duration <minutes>] [--reason <text>]
aiskill-advisor resume
aiskill-advisor mute <skill-name> [--in <project-id>] [--for <duration>]
aiskill-advisor unmute <skill-name> [--in <project-id>]
```

**Why this exists:** Non-technical users granting a tool the right to interject is a big ask. They need confidence that they can SILENCE the advisor at any moment without uninstalling.

- `pause` — disable all suggestions for N minutes (or indefinitely if `--duration` omitted). Writes to `$ASA_HOME/config.json` (`paused_until` field).
- `resume` — re-enable.
- `mute <skill>` — silence one specific skill in this project (or globally if `--in` omitted).
- `unmute <skill>` — un-silence.

The advisor surface ALWAYS includes a visible *"(reply `pause` to silence aiSkillAdvisor for 30 min)"* hint in every suggestion. This is the trust foundation.

---

## 2. File formats 🟢 Locked

### 2.1 `$ASA_HOME/onboard-guidelines.md` — the user's persisted profile

Markdown with YAML frontmatter. Frontmatter is machine-read; body is human-edited and read by the routing engine as context for plain-language output.

```markdown
---
schema_version: 1
created_at: 2026-06-01T14:32:00Z
updated_at: 2026-06-01T14:32:00Z
profile_template: solo-founder
output_preference: plain-language        # plain-language | technical | auto
user_persona:
  role: solo-founder
  technical_level: low                   # low | medium | high
  inferred_from: task-picks              # task-picks | self-report | template-only
projects:
  - id: my-project
    name: the dogfood project
    repo_roots:
      - "~/Projects/MyProject"
    primary_sections: [core-engine, design-brand]
strong_fit_skills:
  - gstack:cso
  - gstack:design-review
  - superpowers:brainstorming
anti_fit_skills:
  - huggingface-skills:hf-cli
  - ios-design-review
confidence_bands:                        # O5 — must be evidence-grounded or omitted
  billing-auth: { band: high, evidence: "80% of related skills mapped" }
  visual-brand: { band: medium, evidence: "60% mapped, weak design-system signal" }
---

# About you

You are a **solo founder** building a US/Canada-focused SaaS product
(the dogfood project) using Claude Code on Windows 11. You prefer plain-language
suggestions.

# How aiSkillAdvisor will help you

- Before merging anything that touches billing or auth, it will suggest `cso`.
- When you say "this should feel premium", it will suggest `design-review`
  even if the change is small.
- It will NOT suggest iOS-specific skills (you build web).

# Edits

Edit any section above by running `aiskill-advisor profile edit`. The
frontmatter is parsed by the tool; the body is read for context.
```

**Rules:**
- `schema_version` required; mismatched versions trigger migration prompt (§7).
- Body sections (`# About you`, etc.) read by plain-language renderer.
- `confidence_bands` is optional. If present, each MUST include `evidence` — bands without evidence rejected at load (O5).

### 2.2 `$ASA_HOME/manifest.yaml` — the skill manifest

Locks the format from `prototypes/manifest-schema-draft.yaml` for v1, with three additions:

1. **`manifest.schema_version`** — integer, required. v1 = `1`.
2. **`precondition`** field per skill (P1).
3. **`generates_or_matches`** field per skill (P3).

**v1 schema (abbreviated; full draft fields preserved from prototype):**

```yaml
manifest:
  schema_version: 1
  version: "1.0.0"
  generated_at: "2026-06-01"
  author: "raghu"
  scope: "user"

projects:
  - id: "my-project"
    name: "the dogfood project"
    repo_roots: ["~/Projects/MyProject"]
    sections:
      - id: "core-engine"
        name: "§1 — Core Engine"
        file_globs: ["src/lib/billing/**", "src/app/api/**", ...]

skills:
  - name: "gstack:cso"
    ecosystem: "gstack"
    description: "Chief Security Officer mode — pre-merge security review"
    when_to_use: "Before merging a PR touching billing, auth, RLS, webhooks..."
    what_it_touches: ["src/lib/billing/**", "src/app/api/billing/**"]
    mutating: false
    section: "core-engine"
    project: "my-project"
    quality_judgment_trigger: false

    # NEW in v1:
    precondition: "direction_locked == false"
    generates_or_matches: "match"
    cost_estimate:
      time_seconds: 300
      llm_usd: 0.40
    plain_language_value: >
      It checks your code for security issues before you ship — like a
      friend who's a security expert looking over your shoulder.

work_types: [...]
loop_prevention: {...}
red_flag_phrases: [...]
output: {...}
auto_discovery: {...}
```

**Validation:** JSON Schema at `schemas/manifest.v1.schema.json`. Invalid manifests → exit 3 with line-numbered error.

**Precondition expressions (P1):** Limited subset — variable, operator, literal only. Variables at route-time: `direction_locked` (bool), `task_intent` (string), `section` (string), `mutating_count` (int from L2). No function calls. Parsed via safe-expression library (e.g., `filtrex`). Invalid expressions reject the skill at load.

### 2.3 `$ASA_HOME/history.jsonl` — suggestion history

One JSON object per line. Append-only.

```json
{
  "event_id": "01H8XK3...",
  "timestamp": "2026-06-01T14:32:15.123Z",
  "session_id": "claude-code-abc123",
  "project_id": "my-project",
  "cwd": "~/Projects/MyProject",
  "prompt_excerpt": "add a promo code system to checkout",
  "files_inferred": ["src/lib/billing/**", "src/app/api/checkout/**"],
  "work_types_matched": ["data-financials", "growth-loyalty-abuse", "spec-ambiguous"],
  "routing_case": "E",
  "signal_0_passed": true,
  "signal_1_votes": { "core-engine": 0.85, "design-brand": 0.10 },
  "signal_2_votes": { "core-engine": 0.70, "propose-new": 0.20 },
  "suggestions": [
    { "skill": "superpowers:brainstorming", "rank": 1, "rationale_short": "ambiguous-scope" },
    { "skill": "gstack:cso", "rank": 2, "rationale_short": "billing surface" }
  ],
  "user_response": "accepted",
  "user_response_target": "gstack:cso",
  "loop_state": { "L1_anchor_declared": true, "L2_mutating_count": 0, "L4_file_set_size": 4 },
  "schema_version": 1
}
```

**`user_response`** values: `accepted` | `declined` | `ignored` (no decision after N minutes) | `unknown`.

**Rules:** Append-only. Rotated when >10 MB → `history.YYYY-MM.jsonl`. F5 reads last 90 days. `prompt_excerpt` truncated to 200 chars.

### 2.4 Project-local override: `./.aiskill-advisor.yaml`

Optional. Lives at project root. Overrides specific keys from user-level manifest **for that project only**.

```yaml
schema_version: 1
project_id: "my-project"
sections_override:
  - id: "growth-marketing"
    name: "§3 — Growth + Marketing"
    file_globs: ["src/components/marketing/**", "src/app/(marketing)/**"]
skills_disable:
  - "vercel:ai-sdk"
skills_add:
  - name: "custom:promo-review"
    ecosystem: "custom"
    when_to_use: "before merging promo-code PRs"
    what_it_touches: ["src/lib/promo/**"]
    mutating: false
    section: "growth-marketing"
output_preference: "technical"
```

**Merge order:** Load user manifest → detect cwd → load project-local → merge → re-validate.

**Security:** Project-local files NOT trusted for `loop_prevention` overrides. Attempts to override stripped silently with stderr warning.

---

## 3. Install flow (F2) 🟢 Locked

### Distribution channels

1. **npm global:** `npm install -g aiskill-advisor`
2. **npx one-shot:** `npx aiskill-advisor init`

Claude Code plugin registry distribution → deferred to v1.1.

### Step-by-step: `npx aiskill-advisor init`

1. **Resolve binary.** npm fetches `aiskill-advisor` (~5 MB). No native binaries.
2. **Check Node version.** `< 18.17.0` → exit 4.
3. **Detect platform.** macOS/Linux: `$HOME/.aiskill-advisor/`. Windows: `%USERPROFILE%\.aiskill-advisor\`. Mode `0700` on POSIX.
4. **Existing config check.** If exists + no `--force` → exit 10.
5. **Permissions requested (none mandatory):**
   - File-system read on `~/.claude/plugins/` (sweep). If denied → continue, user runs `sweep` later.
   - File-system write on `$ASA_HOME/`. If denied → exit 1.
   - **No network access** requested. Init fully offline.
6. **Launch wizard** (TTY required, else `--non-interactive`).
7. **Files created:** all in `$ASA_HOME/` mode 0600.
8. **Auto-sweep** (unless `--skip-sweep`). Conservative ecosystems `--accept-all`; less-known ecosystems prompt per-skill.
9. **Print next-steps box.**

### First-run experience guarantees

- **Drop-off resilience:** Every wizard screen leaves a valid (if minimal) `onboard-guidelines.md`.
- **No goal-articulation upfront:** Question 2 uses show-don't-ask (O6).
- **First suggestion before question 3:** Live preview (O2) shows skills lighting up.

### Upgrade flow

1. New binary installed.
2. Next invocation: read `$ASA_HOME/version.txt`.
3. If installed > version.txt → run migrations (§7).
4. Migrations idempotent + create backups.
5. Update `version.txt`.

### Uninstall

`npm uninstall -g aiskill-advisor` removes binary. **Does NOT** delete `$ASA_HOME/` — user data persists. Intentional: never silently destroy data.

---

## 4. Runtime requirements 🟢 Locked

| Requirement | Version |
|---|---|
| **Node.js** | 18.17+ LTS |
| **npm or pnpm** | npm 9+ or pnpm 8+ |
| **Git** | Optional |
| **OS** | macOS 12+, Linux (glibc 2.28+), Windows 10+ |
| **Disk** | ~50 MB binary; ~5 MB user data |
| **Memory** | <100 MB runtime |
| **Network** | NOT required |

### Optional but recommended (P2)

Static-server detector for verify/browse skills:
- `npx http-server` (Node)
- `python -m http.server` (Python 3)
- `bun serve` (Bun)
- `php -S` (PHP)

If at least one available → `static_server_available=true`. None → suggest install at point of need.

### Platform special cases

- **Windows path separators:** Normalized to forward slashes at parse; compared with both variants.
- **Windows symlinks:** Followed, depth capped at 3.
- **WSL:** Treated as Linux. `$ASA_HOME` is WSL-internal; does NOT share with Windows-side.

---

## 5. Internal architecture — module API contracts 🟡 Strawman

```
            ┌──────────────────────────┐
            │   CLI entry (src/cli.ts) │
            └────────────┬─────────────┘
                         │
      ┌──────────────────┼─────────────────┐
      ▼                  ▼                 ▼
┌────────────┐    ┌────────────────┐  ┌───────────────┐
│ Wizard     │    │ Routing engine │  │ Status        │
└──────┬─────┘    └────────┬───────┘  └───────┬───────┘
       │                   │                  │
       ▼                   ▼                  ▼
┌────────────────────────────────────────────────────┐
│         Manifest loader + validator                │
└──────────────────────┬─────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│            History tracker (jsonl)                 │
└──────────────────────┬─────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│          Plain-language renderer                   │
└──────────────────────┬─────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│      UI surface (TTY printer / JSON emitter)       │
└────────────────────────────────────────────────────┘
```

**TypeScript surfaces sketched:**

```ts
// src/manifest/loader.ts
export function loadManifest(opts: { asaHome: string; cwd?: string; }): Promise<MergedManifest>;
export function validateManifest(raw: unknown): ValidationResult;

// src/routing/engine.ts
export function route(input: RouteInput, manifest: MergedManifest): RouteResult;

// src/history/tracker.ts
export function appendEvent(asaHome: string, event: HistoryEvent): Promise<void>;
export function queryEvents(asaHome: string, q: QueryOpts): Promise<HistoryEvent[]>;
export function suggestionShouldSunset(asaHome: string, skill: string, context: SunsetContext): Promise<boolean>;

// src/render/plain-language.ts
export function renderSuggestion(suggestion: Suggestion, manifest: MergedManifest, profile: UserProfile): string;

// src/wizard/onboarding.ts
export async function runWizard(opts: { asaHome: string; template?: PersonaTemplate; nonInteractive?: boolean; }): Promise<{ profile: UserProfile; manifest: MergedManifest }>;

// src/ui/printer.ts
export function printSuggestion(s: Suggestion, mode: 'plain' | 'technical' | 'json'): void;
export function printRoutingTrace(r: RouteResult): void;
export function printStatus(stats: LedgerStats, mode: 'human' | 'json'): void;
```

All modules pure functions / DI — no module-level singletons. Unit tests trivial: pass fake manifest, assert RouteResult.

---

## 6. Data privacy guarantees (F7) 🟢 Locked

**Default posture: local-first and offline.** A non-technical user must be able to truthfully say: *"Nothing about my code or my work has left my machine."*

### Stored locally (only)

| Data | Location | Mode |
|---|---|---|
| Skill manifest | `$ASA_HOME/manifest.yaml` | 0600 |
| User profile | `$ASA_HOME/onboard-guidelines.md` | 0600 |
| Suggestion history | `$ASA_HOME/history.jsonl` | 0600 |
| Onboarding transcript | `$ASA_HOME/onboarding-transcript.md` | 0600 |
| Runtime config | `$ASA_HOME/config.json` | 0600 |
| Backups | `$ASA_HOME/*.bak*` | 0600 |

### Sent to remote

**By default: NOTHING.** No analytics, no telemetry, no error reporting, no auto-update check.

### Opt-in network features (all default OFF)

```json
{
  "telemetry": {
    "enabled": false,
    "endpoint": "https://telemetry.aiskill-advisor.dev",
    "events": ["suggestion_accepted", "suggestion_declined"],
    "include_prompt_excerpts": false,
    "include_file_paths": false,
    "anonymous_user_id": null
  },
  "update_check": {
    "enabled": false,
    "frequency_days": 14
  }
}
```

**Telemetry, when enabled:** Aggregate counters + skill names + work-type IDs only. **Never** prompts, file paths, user-authored content. The `include_prompt_excerpts`/`include_file_paths` toggles exist as belt-and-suspenders.

### Kill-switch UX (per Agent-1 recommendation) 🟡 Strawman

Every advisor surface (suggestion text, status output, error message) includes a footer hint:

```
(reply `pause 30m` to silence aiSkillAdvisor for 30 minutes)
(reply `mute <skill>` to silence one specific skill)
```

Plus:
- `aiskill-advisor pause` — silence all suggestions.
- `aiskill-advisor mute <skill>` — silence one skill (per project or globally).
- `aiskill-advisor unmute <skill>` — re-enable.

The trust foundation: users WILL be paranoid about an AI tool that interjects unprompted. Making the kill-switch one keystroke away (and visibly always-available) is what converts paranoia → trust.

### Export + delete

- **Export:** `aiskill-advisor profile export ./my-data.zip` — complete portable bundle.
- **Delete:** Users delete `$ASA_HOME/` manually. No `--nuke-everything` command — destruction is intentionally manual.

### Threat model (NOT protected against in v1)

- Hostile process running as the user can read `$ASA_HOME` (POSIX file modes only).
- Encryption at rest NOT in v1. v1.5 candidate.
- Multi-user shared machines: per-user `$ASA_HOME`; cross-user leakage requires privilege escalation.

---

## 7. Versioning + upgrade path 🟢 Locked

### Semver

- **Binary:** Strict semver. `1.0.0` initial. Breaking CLI → MAJOR. New flags → MINOR. Bug fixes → PATCH.
- **Manifest schema_version:** Integer. v1 = `1`. Increments on breaking manifest changes only.
- **History event schema_version:** Integer per-event. Old events readable forever.
- **Profile schema_version:** Integer in frontmatter. Markdown-aware migrations.

### Compatibility matrix

| Binary | Reads schema | Writes schema |
|---|---|---|
| 1.x.x | 1 | 1 |
| 2.x.x (future) | 1, 2 | 2 (with auto-migration prompt) |

**Rule:** binary always reads N-1 schemas. Never writes N-2.

### Upgrade flow (detailed)

1. **Acquire lock** at `$ASA_HOME/.upgrade.lock`.
2. **Read schema_version** from manifest, profile, history.
3. **Run migrations** in order. Each migration: pure function `(oldYaml: string) => newYaml: string`. Writes backup first.
4. **Validate** post-migration against target schema. Invalid → revert from backup; exit 3.
5. **Update** `version.txt`.
6. **Release lock.**

### Migration of `onboard-guidelines.md`

Markdown body **never** auto-rewritten by migrations — only frontmatter. If new frontmatter keys with sensible defaults → migration adds them + one-line body comment: `<!-- aiSkillAdvisor migrated this file from v1 → v2 on 2026-09-15. New fields: <list>. Edit anytime with `profile edit`. -->`

---

## 8. Testing posture 🟢 Locked

See `docs/TESTING_PROTOCOL.md` for full plan. SPEC commits to:

- **Unit tests** for each module surface in §5.
- **Integration tests** for each CLI command — assert exit codes, file mutations, stdout shape.
- **Golden tests** for 4 baseline scenarios from ARCHITECTURE.md (anchor bias, trivial-action misfire, closed-world assumption, loop temptation).
- **No tests touch the network.** Telemetry + update-check tested with mock HTTP server.

---

## 9. Open items for implementing session 🟡 Strawman

Defensible choices with multiple defensible answers:

| # | Question | Default if undecided |
|---|---|---|
| S1 | YAML library | `yaml` package (better error positions) |
| S2 | Expression evaluator for `precondition` | `filtrex` (small, sandboxed) |
| S3 | TTY UI library | `@clack/prompts` (modern, friendly) |
| S4 | JSON Schema validator | `ajv` (industry standard) |
| S5 | History format | JSONL (per spec); SQLite considered v1.1 if >50 MB common |
| S6 | Sweep adapter pattern | Per-ecosystem `src/sweep/<eco>.ts` modules each exporting `discover(asaHome) → Skill[]` |

---

## 10. Acceptance criteria for v1 ship 🟢 Locked

v1 ready when ALL true:

- [ ] All commands in §1 work end-to-end with correct exit codes
- [ ] `init` produces valid manifest + profile on fresh machine in <60 seconds
- [ ] `dry-run` returns sensible suggestions for 4 baseline scenarios from ARCHITECTURE.md
- [ ] `sweep` discovers ≥80% of installed gstack/vercel/superpowers skills on real Claude Code install
- [ ] No network calls without opt-in (verified by running CLI behind blocked-DNS firewall)
- [ ] At least 2 non-technical pilot users complete `init` + run 5+ `dry-run`s without help
- [ ] `status` shows accurate firing/accept rates over 7-day window
- [ ] Manifest schema locked, documented, JSON-Schema-validated
- [ ] Upgrade flow tested against synthetic v0.x → v1.0 migration
- [ ] All `$ASA_HOME` files mode 0600 on POSIX
- [ ] LICENSE + README cover install + first-use without referencing v0 dogfood instance
- [ ] Kill-switch UX (§1.8 + §6) tested: user can silence + mute + unmute without docs

---

## Sequencing recommendation (per Agent-1 brainstorming)

The implementing session should proceed in roughly this order to minimize wasted work:

1. **Phase 1 (Privacy + manifest + storage):** Lock `$ASA_HOME` structure, manifest loader, validator. ~2 weeks. (F7 + P1)
2. **Phase 2 (Routing engine):** Implement Signal 0/1/2 + Cases A-F + L1-L5 from ARCHITECTURE.md. ~2 weeks.
3. **Phase 3 (Dry-run + status + history):** F4 + F5 + F6. ~1.5 weeks.
4. **Phase 4 (Onboarding wizard):** F3 + O1, O2, O3, O6, O7, O8, O9. ~2 weeks.
5. **Phase 5 (Install + auto-sweep + plain-language):** F1 + F2 + plain-language renderer. ~1.5 weeks.
6. **Phase 6 (Kill-switch + polish):** §1.8 commands, error messages, edge cases. ~1 week.
7. **Phase 7 (Pilot users + acceptance criteria):** Run §10 checklist. ~2 weeks.

**Total estimate:** ~12 weeks for a 1-engineer build. Adjust for actual team size.

---

*End of v1 SPEC. Algorithm details: see [`ARCHITECTURE.md`](./ARCHITECTURE.md). Backlog & open questions: see [`BACKLOG.md`](./BACKLOG.md). Vision: see [`PRODUCT_VISION.md`](./PRODUCT_VISION.md). Personas: see [`personas/`](../personas/).*
