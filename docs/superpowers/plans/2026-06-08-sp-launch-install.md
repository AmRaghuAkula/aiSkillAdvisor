# SP-LAUNCH Phase 1 (Install Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make aiSkillAdvisor installable from inside Claude Code with no terminal (self-serving marketplace + committed prebuilt `dist/`), with a reliable `/skill-value` path and a CI guard that keeps the shipped code in sync with source.

**Architecture:** Pure packaging + a tiny runtime hardening. Add `.claude-plugin/marketplace.json` so the repo serves itself as a plugin (`source: "./"`). Commit compiled `dist/` (Claude Code copies plugins, never builds them). Make `dist/` output byte-deterministic across OSes (`newLine: "lf"` + `.gitattributes`) so a CI step can fail the build if committed `dist/` drifts from source. Harden `/skill-value` by having the SessionStart hook inject its own resolved absolute CLI path. The advising/logging engine is unchanged.

**Tech Stack:** TypeScript (NodeNext ESM) → `dist/` via `tsc`; vitest; GitHub Actions; Claude Code plugin + marketplace manifests.

**Spec:** `docs/superpowers/specs/2026-06-08-distribution-launch-design.md`

**Branch:** `feat/sp-launch-distribution` (already created; spec already committed here).

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `tsconfig.json` | modify | add `"newLine": "lf"` → deterministic `tsc` output across OSes |
| `plugin.json` | modify | version `0.0.1` → `0.1.0` |
| `package.json` | modify | version `0.0.1` → `0.1.0` |
| `src/hooks/session-start.ts` | modify | inject the resolved value-report CLI absolute path into context |
| `src/hooks/run-session-start.ts` | modify | resolve that absolute path (env or `import.meta.url`) and pass it |
| `tests/session-start.test.ts` | modify | cover the new path-injection behavior |
| `commands/skill-value.md` | modify | prefer the injected absolute path; keep `${CLAUDE_PLUGIN_ROOT}` as fallback |
| `.gitignore` | modify | stop ignoring `dist/` (keep `build/`, `out/`) |
| `.gitattributes` | create | force LF on committed `dist/**/*.js` + sane defaults |
| `dist/**` | create (commit) | freshly built JS — the runtime the hooks/CLI execute |
| `.claude-plugin/marketplace.json` | create | repo serves itself as a plugin (`source: "./"`) |
| `tests/marketplace.test.ts` | create | guard: marketplace entry name/version/source stays in sync with `plugin.json` |
| `.github/workflows/ci.yml` | modify | add "committed `dist/` is fresh" guard step |
| `INSTALL.md` | create | non-technical, no-terminal `/plugin` install walkthrough |

**Task order rationale:** source/config changes (Tasks 1–2) land first; the authoritative `npm run build` + `dist/` commit happens in Task 3 so it captures the version bump, LF output, and the path fix together.

---

### Task 1: Version bump + deterministic build output

**Files:**
- Modify: `tsconfig.json`
- Modify: `plugin.json`
- Modify: `package.json`

- [ ] **Step 1: Add `newLine: "lf"` to tsconfig**

In `tsconfig.json`, add the option inside `compilerOptions` (after `"sourceMap": false`):

```jsonc
    "sourceMap": false,
    "newLine": "lf"
```

(Ensures `tsc` emits LF line endings on every OS, so a Windows-built `dist/` matches a Linux CI rebuild byte-for-byte.)

- [ ] **Step 2: Bump the plugin version**

In `plugin.json`, change:

```json
  "version": "0.0.1",
```
to:
```json
  "version": "0.1.0",
```

- [ ] **Step 3: Bump the package version**

In `package.json`, change `"version": "0.0.1",` to `"version": "0.1.0",`.

- [ ] **Step 4: Rebuild and run the full suite**

Run: `npm run build && npm test`
Expected: build succeeds; all existing tests pass (no behavior changed yet).

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json plugin.json package.json
git commit -m "chore: bump to 0.1.0 + force LF tsc output for deterministic dist"
```

---

### Task 2: Harden `/skill-value` path (TDD)

**Files:**
- Modify: `tests/session-start.test.ts`
- Modify: `src/hooks/session-start.ts`
- Modify: `src/hooks/run-session-start.ts`
- Modify: `commands/skill-value.md`

- [ ] **Step 1: Write failing tests for path injection**

Add these two cases inside the `describe("buildSessionStartOutput", …)` block in `tests/session-start.test.ts`:

```typescript
  it("injects the value-report CLI path when one is provided", () => {
    const out = buildSessionStartOutput(
      { session_id: "t", cwd: "/tmp/p", hook_event_name: "SessionStart" },
      undefined,
      "/home/u/.claude/plugins/cache/ai-skill-advisor/dist/report/cli.js",
    );
    const ctx = out.hookSpecificOutput.additionalContext;
    expect(ctx).toContain("/home/u/.claude/plugins/cache/ai-skill-advisor/dist/report/cli.js");
    expect(ctx.toLowerCase()).toContain("value report");
  });

  it("omits the report line when no CLI path is provided", () => {
    const out = buildSessionStartOutput(
      { session_id: "t", cwd: "/tmp/p", hook_event_name: "SessionStart" },
      undefined,
    );
    expect(out.hookSpecificOutput.additionalContext.toLowerCase()).not.toContain("value report");
  });
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run tests/session-start.test.ts`
Expected: the two new cases FAIL (the 3rd argument is ignored; "value report" not present / signature mismatch).

- [ ] **Step 3: Add the `reportCliPath` parameter to the builder**

In `src/hooks/session-start.ts`, replace the function signature and body with:

```typescript
export function buildSessionStartOutput(
  input: SessionStartHookInput,
  inventoryBlock?: string,
  reportCliPath?: string,
): HookOutput {
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : "(unknown)";
  const intro =
    `${ADVISOR_MARKER}. You are advised by aiSkillAdvisor for this session ` +
    `(working dir: ${cwd}). Consult the skill inventory below to suggest the right ` +
    `skill at the right moment, per your advisor instructions.`;
  const report =
    typeof reportCliPath === "string" && reportCliPath
      ? ` To run the value report (the /skill-value command), execute with Node: ` +
        `node "${reportCliPath}".`
      : "";
  const block = typeof inventoryBlock === "string" && inventoryBlock ? `\n\n${inventoryBlock}` : "";
  return {
    hookSpecificOutput: {
      // Hardcoded: this builder serves the single SessionStart event we wire.
      hookEventName: "SessionStart",
      additionalContext: `${intro}${report}${block}`,
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/session-start.test.ts`
Expected: PASS (all cases, old and new).

- [ ] **Step 5: Resolve and pass the absolute path in the runner**

In `src/hooks/run-session-start.ts`, add imports at the top and a resolver, then pass it. Replace the file contents with:

```typescript
import { buildSessionStartOutput } from "./session-start.js";
import { sweepInventory } from "../inventory/sweep.js";
import { formatInventory } from "../inventory/format.js";
import type { SessionStartHookInput } from "../types.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Absolute path to the bundled value-report CLI. Prefer CLAUDE_PLUGIN_ROOT (set
 * for hooks); fall back to this file's own location (dist/hooks/ -> plugin root).
 * Robust whether installed via marketplace or loaded with --plugin-dir.
 */
function resolveReportCliPath(): string | undefined {
  try {
    const root =
      process.env.CLAUDE_PLUGIN_ROOT ??
      join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    return join(root, "dist", "report", "cli.js");
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let input: SessionStartHookInput;
  try {
    input = JSON.parse(raw) as SessionStartHookInput;
  } catch {
    process.exit(0);
  }

  let block: string | undefined;
  try {
    const inv = sweepInventory();
    block = formatInventory(inv.skills);
  } catch {
    block = undefined; // never let inventory work crash the session
  }

  process.stdout.write(
    JSON.stringify(buildSessionStartOutput(input, block, resolveReportCliPath())),
  );
  process.exit(0);
}

void main();
```

- [ ] **Step 6: Update the `/skill-value` command to prefer the injected path**

Replace the body of `commands/skill-value.md` (keep the frontmatter unchanged) below the `# /skill-value` heading with:

```markdown
Run the report CLI and show its output verbatim to the user. The argument is the
window: `session` (default), `today`, or `week`.

To run it, use the absolute CLI path that aiSkillAdvisor injected into the SessionStart
context (the line: `To run the value report (the /skill-value command), execute with
Node: node "<path>".`). Run that exact command with the window appended, e.g.
`node "<path>" $ARGUMENTS`.

If that line is not present, fall back to:
`node "${CLAUDE_PLUGIN_ROOT}/dist/report/cli.js" $ARGUMENTS`.

Then present the output as-is. Do not editorialize or invent numbers — the CLI is the
source of truth.
```

- [ ] **Step 7: Add a runner integration assertion (proves `resolveReportCliPath` works end-to-end)**

The unit test covers the builder; this proves the *runner* actually resolves a real path
via `import.meta.url`. Add this case to `tests/run-session-start.int.test.ts`, inside the
`describe("run-session-start wrapper (built)", …)` block:

```typescript
  it("injects an absolute value-report CLI path pointing at the built CLI", () => {
    const input = JSON.stringify({ session_id: "x", cwd: "/tmp/p", hook_event_name: "SessionStart" });
    const out = execFileSync("node", [wrapper], { input, encoding: "utf8" });
    const ctx = JSON.parse(out).hookSpecificOutput.additionalContext as string;
    expect(ctx.toLowerCase()).toContain("value report");
    expect(ctx).toMatch(/dist[\\/]report[\\/]cli\.js/); // tolerant of OS path separator
  });
```

(This test runs the *built* wrapper, so it requires Step 8's rebuild to have run.)

- [ ] **Step 8: Rebuild and run the full suite**

Run: `npm run build && npm test`
Expected: build succeeds; all tests pass (including the new integration assertion).

- [ ] **Step 9: Commit**

```bash
git add src/hooks/session-start.ts src/hooks/run-session-start.ts tests/session-start.test.ts tests/run-session-start.int.test.ts commands/skill-value.md
git commit -m "feat: inject resolved value-report CLI path so /skill-value works when installed"
```

---

### Task 3: Ship prebuilt `dist/` (un-ignore + `.gitattributes` + commit)

**Files:**
- Modify: `.gitignore`
- Create: `.gitattributes`
- Create (commit): `dist/**`

- [ ] **Step 1: Stop ignoring `dist/`**

In `.gitignore`, find the "Build output" block:

```
# Build output
dist/
build/
out/
```
and remove the `dist/` line (keep the other two):
```
# Build output
build/
out/
```

- [ ] **Step 2: Create `.gitattributes` (repo-wide LF — per review decision D1)**

Create `.gitattributes` at the repo root:

```gitattributes
# Normalize line endings; keep committed build output stable across OSes.
* text=auto eol=lf
dist/**/*.js text eol=lf
*.png binary
*.jpg binary
*.gif binary
```

- [ ] **Step 3: Isolate the line-ending normalization in its own commit**

The repo has `core.autocrlf=true` + ~79 tracked text files, so the rule above will
renormalize many files. Keep that churn OUT of the functional commits so it's reviewable
and revertable on its own:

```bash
git add .gitignore .gitattributes
git add --renormalize .
git commit -m "chore: normalize line endings to LF (.gitattributes)"
```
Expected: this commit contains `.gitignore`, `.gitattributes`, and line-ending-only
changes to existing text files (no logic changes). It must NOT contain `dist/` (still
ignored until the next step) or any `src/` content edits.

- [ ] **Step 4: Do the authoritative build (clean install first → matches CI's pinned tsc)**

Run: `npm ci && npm run build`
Expected: deps install from the lockfile (so local `tsc` == the version CI uses);
`dist/` regenerated with LF endings, version + path-fix included.

- [ ] **Step 5: Stage and verify `dist/` is now tracked**

Run:
```bash
git add dist
git status --porcelain -- dist | head
```
Expected: `dist/**.js` files appear staged (lines starting with `A`).

- [ ] **Step 6: Commit the prebuilt output**

```bash
git commit -m "build: ship prebuilt dist/ for no-build install"
```

- [ ] **Step 7: Prove the build is reproducible (the invariant CI will enforce)**

Run:
```bash
npm run build && git status --porcelain -- dist
```
Expected: **empty output** (rebuilding produces no diff against the committed `dist/`). If anything prints, the build is non-deterministic — STOP and investigate (likely a stray `newLine` or an untracked new module) before continuing.

---

### Task 4: Self-serving marketplace manifest (+ consistency test)

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `tests/marketplace.test.ts`

- [ ] **Step 1: Write the failing consistency test**

Create `tests/marketplace.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Guards the install surface: the marketplace must list THIS plugin, point at the
// repo root, and never drift from plugin.json's name/version (so version bumps
// stay in lockstep).
describe("marketplace.json stays consistent with plugin.json", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const read = (p: string) => JSON.parse(readFileSync(resolve(here, p), "utf8"));

  it("lists the plugin with matching name + version and a self source", () => {
    const market = read("../.claude-plugin/marketplace.json");
    const plugin = read("../.claude-plugin/plugin.json");
    expect(typeof market.name).toBe("string");
    expect(market.owner?.name).toBeTruthy();
    const entry = (market.plugins ?? []).find((p: { name?: string }) => p.name === plugin.name);
    expect(entry, `marketplace.json must list plugin '${plugin.name}'`).toBeTruthy();
    expect(entry.source).toBe("./");
    expect(entry.version).toBe(plugin.version);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/marketplace.test.ts`
Expected: FAIL (cannot read `.claude-plugin/marketplace.json` — file does not exist).

- [ ] **Step 3: Create the marketplace manifest**

Create `.claude-plugin/marketplace.json`:

```json
{
  "name": "ai-skill-advisor",
  "owner": {
    "name": "Raghu Akula",
    "url": "https://github.com/AmRaghuAkula"
  },
  "plugins": [
    {
      "name": "ai-skill-advisor",
      "source": "./",
      "description": "Always-on advisor that suggests the right Claude Code skill at the right moment.",
      "version": "0.1.0"
    }
  ]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/marketplace.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin/marketplace.json tests/marketplace.test.ts
git commit -m "feat: self-serving marketplace.json so the repo installs as a plugin"
```

---

### Task 5: CI guard — committed `dist/` must be fresh

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the freshness guard after the build step**

In `.github/workflows/ci.yml`, replace the `steps:` tail (from `- run: npm run build` onward) with:

```yaml
      - run: npm run build
      - name: Verify committed dist/ matches source
        run: |
          if [ -n "$(git status --porcelain -- dist)" ]; then
            echo "::error::dist/ is out of date — run 'npm run build' and commit dist/."
            git --no-pager diff -- dist
            git status --porcelain -- dist
            exit 1
          fi
      - run: npm test
```

- [ ] **Step 2: Sanity-check the YAML locally**

Run: `node -e "require('js-yaml')" 2>/dev/null && npx --yes js-yaml .github/workflows/ci.yml >/dev/null && echo "YAML OK" || echo "skip (js-yaml not installed) — visually verify indentation"`
Expected: `YAML OK`, or the skip message (then visually confirm the two-space `steps:` indentation matches the surrounding file).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: fail the build if committed dist/ drifts from source"
```

---

### Task 6: `INSTALL.md` — no-terminal install walkthrough

**Files:**
- Create: `INSTALL.md`

- [ ] **Step 1: Write the install guide**

Create `INSTALL.md`:

```markdown
# Installing aiSkillAdvisor

aiSkillAdvisor installs **inside Claude Code** — no terminal needed. Install it once
at "user" scope and it's active in **every** project automatically. Nothing is written
into your project repos.

> Requirement: Node.js must be installed (the advisor's hooks run on Node).

## Install with no terminal (recommended)

In any Claude Code session (VS Code extension or desktop app):

1. Run `/plugin`.
2. Open the **Marketplaces** tab → **Add marketplace** → paste:
   `AmRaghuAkula/aiSkillAdvisor`
3. Open the **Discover** tab → find **ai-skill-advisor** → **Install**.
4. Choose **User** scope (so it's on in every project).
5. Run `/reload-plugins`.

That's it. You'll see skill suggestions as you work, and `/skill-value` shows what the
advisor has done for you.

## Install from the terminal (optional, for CLI users)

```bash
claude plugin marketplace add AmRaghuAkula/aiSkillAdvisor
claude plugin install ai-skill-advisor@ai-skill-advisor --scope user
```

## Verify it loaded

- `/plugin list` → `ai-skill-advisor` shows as enabled
- `/hooks` → shows aiSkillAdvisor's hooks
- `/skill-value` → prints a (possibly empty) value report

## Update

Re-run the install (or `claude plugin update ai-skill-advisor@ai-skill-advisor`) to get
the latest version, then `/reload-plugins`.
```

- [ ] **Step 2: Commit**

```bash
git add INSTALL.md
git commit -m "docs: no-terminal install walkthrough (INSTALL.md)"
```

---

### Task 7: Full verification + PR

**Files:** none (verification + integration).

- [ ] **Step 1: Clean build + full suite + freshness invariant**

Run:
```bash
npm ci && npm run build && npm test && git status --porcelain -- dist
```
Expected: install + build succeed; **all tests pass**; the final `git status` line prints **nothing** (committed `dist/` matches a clean rebuild). If `dist/` shows a diff, commit it (`git add dist && git commit -m "build: refresh dist"`) and re-run.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feat/sp-launch-distribution
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --base main --title "SP-LAUNCH Phase 1: no-terminal install (marketplace + prebuilt dist)" --body "$(cat <<'EOF'
## What
Makes aiSkillAdvisor installable from inside Claude Code with no terminal.

- Self-serving `.claude-plugin/marketplace.json` (repo installs as a plugin, `source: "./"`)
- Commit prebuilt `dist/` (Claude Code copies plugins, never builds them) + `.gitattributes` + `newLine: "lf"` for byte-deterministic output
- CI guard fails if committed `dist/` drifts from source
- `/skill-value` path hardened: SessionStart injects the resolved absolute CLI path (works when installed, not just under `--plugin-dir`)
- Version `0.1.0`; `INSTALL.md` walkthrough
- `tests/marketplace.test.ts` keeps marketplace ↔ plugin metadata in lockstep

Spec: `docs/superpowers/specs/2026-06-08-distribution-launch-design.md`
Plan: `docs/superpowers/plans/2026-06-08-sp-launch-install.md`

## Out of scope (follow-ups)
- Phase 2: launch README
- SP3b (L2/L5 hardening + multi-turn evals), SP4, SP5

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Confirm CI is green**

Run: `gh pr checks --watch`
Expected: all checks pass (including the new dist-freshness guard).

---

### Task 8: Acceptance — install in a real project (founder-run, post-merge)

> This is the human verification gate. It needs a real Claude Code session and is run by
> the founder. It is **not** automated. Installing from the GitHub marketplace requires the
> changes to be on `main`, so this runs **immediately after merge**. (If pre-merge proof is
> wanted, add the local repo as a marketplace instead — `claude plugin marketplace add <local-path>` — which exercises the identical copy-and-load flow.)

- [ ] **Step 1: Merge once CI is green**

```bash
gh pr merge --squash --delete-branch
```

- [ ] **Step 2: Install in OnePersonAI via the no-terminal flow**

In a Claude Code session opened in the **OnePersonAI** project, follow `INSTALL.md`:
`/plugin` → Marketplaces → Add `AmRaghuAkula/aiSkillAdvisor` → Discover → Install `ai-skill-advisor` → **User** scope → `/reload-plugins`.

- [ ] **Step 3: Confirm it loaded and works**

- `/plugin list` shows `ai-skill-advisor` enabled; `/hooks` shows its hooks.
- Send a prompt that should trigger a suggestion → the advisor surfaces one.
- Run `/skill-value` → a real report prints (**confirms the path fix in the installed case**).
- The report shows `Suggestions made: ≥ 1` (**closes the deferred AI marker-emission check**).

- [ ] **Step 4: Confirm no repo contamination**

Run `git status` in the OnePersonAI repo → no new aiSkillAdvisor files (install is user-scoped; the value log lives under `~/.claude/…`, not in the repo).

- [ ] **Step 5: Update the resume memory**

Record in `project-current-status.md`: Phase 1 merged + installed + verified; the marker-emission check is closed; next = Phase 2 (README).

---

## Self-Review

**Spec coverage:**
- marketplace.json → Task 4 ✅ · commit prebuilt dist → Task 3 ✅ · .gitattributes (LF) → Task 3 ✅ · version 0.1.0 → Task 1 ✅ · `/skill-value` path hardening → Task 2 ✅ · CI dist-freshness guard → Task 5 ✅ · INSTALL.md → Task 6 ✅ · end-to-end install verification → Task 8 ✅.
- Spec §5 "verify-then-decide" for EF3: resolved by the mechanics-independent injected-path approach (works regardless of `${CLAUDE_PLUGIN_ROOT}` command-body expansion), with `${CLAUDE_PLUGIN_ROOT}` kept as fallback — no separate research round-trip needed; Task 8 confirms it live.
- Spec §10 dist determinism: addressed by `newLine: "lf"` (Task 1) + `.gitattributes` (Task 3) + the reproducibility check (Task 3 Step 6) + CI guard (Task 5).

**Placeholder scan:** none — every code/config step shows the actual content.

**Type/name consistency:** `buildSessionStartOutput(input, inventoryBlock?, reportCliPath?)` defined in Task 2 Step 3, exercised with the 3-arg form in Task 2 Step 1 and called in Task 2 Step 5. `resolveReportCliPath()` defined and used in the same runner file. Marketplace plugin name `ai-skill-advisor` matches `plugin.json`; install id is `ai-skill-advisor@ai-skill-advisor` (marketplace name == plugin name), used consistently in `INSTALL.md` and the PR body.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | clean (folded) | 1 arch (decided D1), 1 quality + 1 test gap (folded in) |

**Step 0 (scope):** accepted as-is — ~13 files but mostly tiny config/docs + generated `dist/`; reuses existing fallback, exec-form hooks, and CI. No new services/abstractions.

**Findings & resolutions:**
- **[P1] arch — `.gitattributes` scope.** Repo has `core.autocrlf=true` + 79 tracked text files; a repo-wide `* text=auto eol=lf` renormalizes all of them. **Decision D1: keep repo-wide** (user choice, against the narrow recommendation). Mitigation folded in: Task 3 isolates the normalization in its own `git add --renormalize` commit so the churn is reviewable/revertable separately from logic.
- **[P2] quality — local vs CI `tsc` drift.** Committed `dist/` must match the Linux CI rebuild. Folded in: Task 3 Step 4 runs `npm ci` before the authoritative build (aligns local `tsc` with the lockfile'd version CI uses). Task 7 re-verifies via `npm ci && build && git status --porcelain -- dist` (empty = reproducible).
- **[P2] test gap — `resolveReportCliPath()` (the EF3 fix) untested in the runner.** Folded in: Task 2 Step 7 adds a built-wrapper integration assertion that the injected context contains a path matching `/dist[\\/]report[\\/]cli\.js/`.

**Test coverage:** unit (builder path-injection: present + absent) + integration (runner resolves a real path) + marketplace↔plugin consistency guard + CI dist-freshness guard. No code path in the diff is left untested.

**Failure modes:** Node missing on the user's PATH → all hooks silently no-op (inherent to the plugin; documented as a requirement in `INSTALL.md`; out of scope to auto-detect here). Non-deterministic `dist/` → caught by the CI freshness guard (hard fail, not silent).

**NOT in scope:** Phase 2 launch README · installing other skills (SP5) · L2/L5 hardening + multi-turn evals (SP3b) · auto-update beyond `/plugin` · narrowing `.gitattributes` (user chose repo-wide).

**Parallelization:** Sequential implementation — tasks share `dist/`, the manifests, and the hook files; no independent lanes.

**VERDICT: ENG CLEARED — ready to implement.** One architectural decision (D1) made by the user; two improvements folded into the plan; zero critical gaps.
