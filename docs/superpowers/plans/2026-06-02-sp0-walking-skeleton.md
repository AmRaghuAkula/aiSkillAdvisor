# SP0 — Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an installable Claude Code plugin whose always-on "tap" fires at session start and deterministically injects a marker line into the session — proving the end-to-end loop (plugin loads → hook fires → context injected → brain skill registered) before any real logic is built.

**Architecture:** A Claude Code plugin at the repo root (`.claude-plugin/plugin.json` + `skills/` + `hooks/`). Deterministic logic is TypeScript compiled to `dist/`. The `SessionStart` hook runs a Node wrapper that reads the hook JSON from stdin and writes a `hookSpecificOutput.additionalContext` JSON to stdout. A stub `SKILL.md` registers the "brain" so it is discoverable. Unit + integration tests run under vitest; a GitHub Actions workflow gates every PR so `main` only ever receives green.

**Tech Stack:** TypeScript (compiled with `tsc` → `dist/`), Node ≥ 20, vitest (unit + integration), GitHub Actions (CI). Local plugin dev via `claude --plugin-dir .`. Playwright is NOT used in SP0 (no browser surface yet — it arrives with the control-panel UI in SP4/SP5).

**Discipline note (OnePersonAICompany standing rules):** All work in this plan happens on a single feature branch `feat/sp0-walking-skeleton`. Nothing is committed to `main` directly. The branch merges into `main` only via PR, only after CI is green. Only this one branch is active for the duration.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | Project metadata, scripts (`build`, `test`), dev deps (typescript, vitest, @types/node) |
| `tsconfig.json` | TypeScript compiler config (NodeNext, strict, `src` → `dist`) |
| `vitest.config.ts` | Test runner config |
| `.gitignore` | Add `node_modules/`, `dist/` (root `.gitignore` already exists — append) |
| `.claude-plugin/plugin.json` | Plugin manifest (`name`, metadata, hooks path) |
| `skills/advisor/SKILL.md` | Stub "brain" skill so it is registered/discoverable |
| `src/types.ts` | Hook input/output TypeScript interfaces |
| `src/hooks/session-start.ts` | Pure function `buildSessionStartOutput(input)` — the testable core |
| `src/hooks/run-session-start.ts` | Thin stdin→logic→stdout wrapper invoked by the hook |
| `hooks/hooks.json` | Wires `SessionStart` → the compiled wrapper |
| `tests/session-start.test.ts` | Unit test for the pure function |
| `tests/run-session-start.int.test.ts` | Integration test: pipe mock JSON through the built wrapper |
| `.github/workflows/ci.yml` | CI: install → build → test on every PR to `main` |

---

## Task 0: Create the feature branch

- [ ] **Step 1: Verify clean slate (one-active-branch rule)**

Run:
```bash
git ls-remote --heads origin
gh pr list --state open
```
Expected: only `refs/heads/main` listed; no open PRs. If anything else exists, STOP and ask the founder before branching.

- [ ] **Step 2: Create and switch to the branch**

Run:
```bash
git checkout main && git pull --prune
git checkout -b feat/sp0-walking-skeleton
```
Expected: `Switched to a new branch 'feat/sp0-walking-skeleton'`. (Any uncommitted plan files in the working tree carry over — that's fine.)

---

## Task 1: Project scaffolding (Node/TS + vitest)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ai-skill-advisor",
  "version": "0.0.1",
  "description": "Always-on advisor that suggests the right Claude Code skill at the right moment.",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": {
    "node": ">=20"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": false
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Append to `.gitignore`**

Add these two lines to the existing `.gitignore` (the `node_modules/` line may already be present — if so, only add `dist/`):
```
# Build + deps
dist/
node_modules/
```

- [ ] **Step 5: Install dependencies**

Run:
```bash
npm install
```
Expected: `node_modules/` created and `package-lock.json` generated (needed for CI's `npm ci`).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore
git commit -m "chore: scaffold Node/TS project with vitest"
```

---

## Task 2: SessionStart context builder (pure logic, TDD)

**Files:**
- Create: `src/types.ts`
- Create: `src/hooks/session-start.ts`
- Test: `tests/session-start.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/session-start.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  buildSessionStartOutput,
  ADVISOR_MARKER,
} from "../src/hooks/session-start.js";

describe("buildSessionStartOutput", () => {
  it("returns a SessionStart hook output that injects the advisor marker", () => {
    const out = buildSessionStartOutput({
      session_id: "test-123",
      cwd: "/tmp/project",
      hook_event_name: "SessionStart",
    });

    expect(out.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(out.hookSpecificOutput.additionalContext).toContain(ADVISOR_MARKER);
    expect(out.hookSpecificOutput.additionalContext).toContain("/tmp/project");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm test
```
Expected: FAIL — cannot resolve `../src/hooks/session-start.js` (module does not exist yet).

- [ ] **Step 3: Create the types**

Create `src/types.ts`:
```ts
export interface SessionStartHookInput {
  session_id: string;
  cwd: string;
  hook_event_name: string;
  /** Present on SessionStart: "startup" | "resume" | "clear" | "compact" — optional for SP0. */
  source?: string;
}

export interface HookSpecificOutput {
  hookEventName: string;
  additionalContext: string;
}

export interface HookOutput {
  hookSpecificOutput: HookSpecificOutput;
}
```

- [ ] **Step 4: Write the minimal implementation**

Create `src/hooks/session-start.ts`:
```ts
import type { SessionStartHookInput, HookOutput } from "../types.js";

export const ADVISOR_MARKER = "aiSkillAdvisor active";

export function buildSessionStartOutput(
  input: SessionStartHookInput,
): HookOutput {
  const context =
    `${ADVISOR_MARKER} (SP0 walking skeleton). Working dir: ${input.cwd}. ` +
    `The advising engine is not wired yet — this line only proves the ` +
    `always-on tap fires and can inject context into the session.`;

  return {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: context,
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:
```bash
npm test
```
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/hooks/session-start.ts tests/session-start.test.ts
git commit -m "feat: add SessionStart context builder with unit test"
```

---

## Task 3: stdin→stdout hook wrapper (integration-tested)

**Files:**
- Create: `src/hooks/run-session-start.ts`
- Test: `tests/run-session-start.int.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `tests/run-session-start.int.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const wrapper = resolve(here, "../dist/hooks/run-session-start.js");

describe("run-session-start wrapper (built)", () => {
  beforeAll(() => {
    // The wrapper is the compiled output; the build step must run first.
    if (!existsSync(wrapper)) {
      throw new Error(
        `Build artifact missing: ${wrapper}. Run \`npm run build\` before the integration test.`,
      );
    }
  });

  it("reads hook JSON from stdin and writes hook output JSON to stdout", () => {
    const input = JSON.stringify({
      session_id: "x",
      cwd: "/tmp/p",
      hook_event_name: "SessionStart",
    });

    const stdout = execFileSync("node", [wrapper], {
      input,
      encoding: "utf8",
    });

    const parsed = JSON.parse(stdout);
    expect(parsed.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(parsed.hookSpecificOutput.additionalContext).toContain(
      "aiSkillAdvisor active",
    );
  });
});
```

- [ ] **Step 2: Run build + test to verify it fails**

Run:
```bash
npm run build && npm test
```
Expected: FAIL — build error (cannot find `src/hooks/run-session-start.ts`) OR the integration test throws "Build artifact missing".

- [ ] **Step 3: Write the wrapper**

Create `src/hooks/run-session-start.ts`:
```ts
import { buildSessionStartOutput } from "./session-start.js";
import type { SessionStartHookInput } from "../types.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();

  let input: SessionStartHookInput;
  try {
    input = JSON.parse(raw) as SessionStartHookInput;
  } catch {
    // No/invalid stdin — emit nothing and succeed (non-blocking, exit 0).
    process.exit(0);
  }

  const output = buildSessionStartOutput(input);
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

void main();
```

- [ ] **Step 4: Run build + test to verify it passes**

Run:
```bash
npm run build && npm test
```
Expected: PASS (2 tests — unit + integration).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/run-session-start.ts tests/run-session-start.int.test.ts
git commit -m "feat: add stdin/stdout SessionStart hook wrapper with integration test"
```

---

## Task 4: Plugin manifest, brain stub, and hook wiring

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `skills/advisor/SKILL.md`
- Create: `hooks/hooks.json`

- [ ] **Step 1: Create the plugin manifest**

Create `.claude-plugin/plugin.json`:
```json
{
  "name": "ai-skill-advisor",
  "displayName": "aiSkillAdvisor",
  "description": "Always-on advisor that suggests the right Claude Code skill at the right moment.",
  "version": "0.0.1",
  "author": {
    "name": "Raghu Akula",
    "url": "https://github.com/AmRaghuAkula"
  },
  "repository": "https://github.com/AmRaghuAkula/aiSkillAdvisor",
  "license": "PolyForm-Noncommercial-1.0.0",
  "hooks": "./hooks/hooks.json"
}
```
Note: `skills/` is auto-discovered (no need to declare it). `hooks` points at the config file created below.

- [ ] **Step 2: Create the stub brain skill**

Create `skills/advisor/SKILL.md`:
```markdown
---
name: advisor
description: The aiSkillAdvisor brain — surfaces the right skill at the right moment based on what you are working on. SP0 stub; the routing engine, inventory awareness, and value log arrive in later sub-projects.
---

# aiSkillAdvisor (SP0 stub)

This is the walking-skeleton stub of the advisor brain. It exists so the
skill is registered and discoverable. The routing engine (SP2), inventory
awareness (SP1), value log (SP3), onboarding (SP4), and sweep + install
(SP5) are built in later sub-projects.
```

- [ ] **Step 3: Wire the SessionStart hook**

Create `hooks/hooks.json`:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["${CLAUDE_PLUGIN_ROOT}/dist/hooks/run-session-start.js"],
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```
Note: the hook runs the COMPILED wrapper in `dist/`, so `npm run build` must have run before loading the plugin.

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/plugin.json skills/advisor/SKILL.md hooks/hooks.json
git commit -m "feat: add plugin manifest, brain stub skill, and SessionStart hook wiring"
```

---

## Task 5: CI workflow (enforces tests-green-before-merge)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the CI workflow**

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - run: npm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run build + tests on every PR to main"
```

---

## Task 6: Manual end-to-end verification (the actual "walking skeleton" proof)

This task is manual — it confirms the plugin actually loads in Claude Code and the tap fires. No automated test can fully replace it (hook firing is harness-driven).

- [ ] **Step 1: Build**

Run:
```bash
npm run build
```
Expected: `dist/hooks/run-session-start.js` exists.

- [ ] **Step 2: Load the plugin locally with debug on**

Run (from the repo root):
```bash
claude --plugin-dir . --debug
```

- [ ] **Step 3: Confirm the tap fired**

In the debug output at session start, expect to see the `SessionStart` hook execute the `run-session-start.js` command and return JSON containing `aiSkillAdvisor active`. Confirm Claude's session context includes the injected marker (e.g., ask Claude "is the aiSkillAdvisor tap active?" and it should reference the injected line).

- [ ] **Step 4: Confirm the brain is registered**

Run `/skills` (or check the skills menu) and confirm `ai-skill-advisor:advisor` appears.

- [ ] **Step 5: Record the result**

Note the outcome (pass/fail + any debug observations) in the PR description. If the hook did not fire, capture the `--debug` output for diagnosis before proceeding.

---

## Task 7: Open PR and merge on green (discipline gate)

- [ ] **Step 1: Push the branch**

Run:
```bash
git push -u origin feat/sp0-walking-skeleton
```

- [ ] **Step 2: Open the PR**

Run:
```bash
gh pr create --base main --head feat/sp0-walking-skeleton \
  --title "feat: SP0 walking skeleton — plugin scaffold + always-on SessionStart tap" \
  --body "Implements SP0 per docs/superpowers/plans/2026-06-02-sp0-walking-skeleton.md. Plugin scaffold, SessionStart tap that injects context, stub brain skill, unit + integration tests, and CI. Includes manual end-to-end verification result below."
```

- [ ] **Step 3: Wait for CI to pass**

Run:
```bash
gh pr checks --watch
```
Expected: the `test` job passes green. Do NOT merge until green (tests-green-before-merge rule).

- [ ] **Step 4: Merge and clean up**

Run:
```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --prune
git branch -a
```
Expected: `git branch -a` shows only `main` (+ `origin/main`) — slate clean for SP1.

---

## Self-Review (completed by plan author)

- **Spec coverage:** SP0 covers the spec's §3 "runtime mechanism" (the tap) and §1 "it's a plugin" at the thinnest end-to-end slice. It deliberately does NOT cover the brain logic (SP2), inventory (SP1), log (SP3), onboarding (SP4), or sweep/install (SP5) — those are separate sub-project plans.
- **Placeholder scan:** No TBD/TODO; every code + command step shows real content.
- **Type consistency:** `SessionStartHookInput`, `HookOutput`, `HookSpecificOutput`, `buildSessionStartOutput`, and `ADVISOR_MARKER` are used identically across `src/`, `tests/`, and the wrapper.
- **Discipline alignment:** single branch, no direct main commit, CI gates merge on green — matches the OnePersonAICompany standing rules.

---

## Next sub-project

After SP0 merges: **SP1 — Inventory awareness** (read what skills the user actually has). New plan, new single branch.
