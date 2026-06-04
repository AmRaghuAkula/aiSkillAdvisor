# SP1 — Inventory Awareness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give aiSkillAdvisor an accurate, deduplicated view of the skills the user *actually* has installed — scanning both skill locations (enabled plugin cache + the user skills folder) — and surface the count through the existing session-start tap.

**Architecture:** A small, pure, fixture-testable `inventory` module: parse a `SKILL.md`'s frontmatter → scan one `skills/` directory (direct children only) → resolve all scan locations from local config → sweep + dedup into a typed `Inventory`. The SessionStart hook wrapper calls the sweep and passes the count into the (already-existing) context builder. All filesystem-dependent tests run against a committed fixture tree, never the live machine.

**Tech Stack:** TypeScript → `dist/`, vitest, `gray-matter` (robust SKILL.md frontmatter parsing). Node ≥ 20. Builds on SP0.

**Discipline note (standing rules):** All work on a single branch `feat/sp1-inventory-awareness`. No direct `main` commits. Merge via PR only after CI is green. Only this one branch active.

**Portability:** the sweep reads the *runtime environment's* `~/.claude`, so it works unchanged in any repo (incl. HireAstra) — no per-repo configuration.

---

## Design decisions (resolved; confirm at review)

1. **Scan both locations.** (a) Enabled cache plugins — from `~/.claude/settings.json` `enabledPlugins` cross-referenced with `~/.claude/plugins/installed_plugins.json` `installPath`, scanning `<installPath>/skills/`. (b) The user skills folder `~/.claude/skills/`. *Rationale: gstack lives only in (b); missing it = a half-blind advisor.*
2. **Direct children only.** For each `skills/` root, a skill is `<root>/<dir>/SKILL.md` — we do NOT recurse. This naturally skips vendored `upstream/SKILL.md` sub-docs and a plugin's internal `.claude/skills/` dev tooling (different path).
3. **Dedup by skill name, first-wins.** gstack skills appear duplicated (top-level + under `gstack/`); each name is counted once.
4. **Enabled-only for plugins; all user skills.** Disabled-but-installed plugins are skipped (they aren't usable). User-folder skills are always active, so all are included.
5. **Surface a count** through the existing SessionStart tap (visible end-to-end proof). Full per-skill routing is SP2, not here.
6. **Add `gray-matter`** (small, standard) rather than hand-rolling frontmatter parsing — descriptions are long free-text and must parse robustly.

## SP0 review follow-ups folded in
- (Task 5) runtime-validate the parsed hook input shape (no bare trust of `cwd`).
- (Task 5) comment that `hookEventName` is intentionally hardcoded to the wired event.
- (Task 3 wrapper) add an automated test for the empty/invalid-stdin path.
- (Task 5) integration test uses the exported `ADVISOR_MARKER` constant, not a literal.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/inventory/types.ts` | `SkillEntry`, `Inventory` interfaces |
| `src/inventory/parse-skill.ts` | Parse one `SKILL.md` → `{ name, description }` (gray-matter; dir-name fallback) |
| `src/inventory/scan-skills-dir.ts` | Scan one `skills/` dir (direct children) → `SkillEntry[]` |
| `src/inventory/locations.ts` | Resolve scan locations from local config (enabled plugins + user skills) |
| `src/inventory/sweep.ts` | Orchestrate: resolve locations → scan → dedup → `Inventory` |
| `src/hooks/session-start.ts` | MODIFY: accept skill count + runtime-validate `cwd` |
| `src/hooks/run-session-start.ts` | MODIFY: call sweep, pass count |
| `tests/fixtures/fake-claude/**` | Committed fixture tree (fake plugins + user skills + config) |
| `tests/inventory/*.test.ts` | Unit tests for parse/scan/locations/sweep (fixture-based) |
| `tests/session-start.test.ts` | MODIFY: assert count + cwd-fallback behavior |
| `tests/run-session-start.int.test.ts` | MODIFY: use `ADVISOR_MARKER`; add empty-stdin case |
| `package.json` | MODIFY: add `gray-matter` dependency |

---

## Task 0: Create the feature branch

- [ ] **Step 1: Verify clean slate**

Run:
```bash
git ls-remote --heads origin
gh pr list --state open
```
Expected: only `main`, no open PRs. If anything else exists, STOP and ask before branching.

- [ ] **Step 2: Branch**

Run:
```bash
git checkout main && git pull --prune
git checkout -b feat/sp1-inventory-awareness
```

---

## Task 1: Inventory types + SKILL.md parser (TDD)

**Files:** Create `src/inventory/types.ts`, `src/inventory/parse-skill.ts`, `tests/inventory/parse-skill.test.ts`; modify `package.json`.

- [ ] **Step 1: Add the dependency**

Run:
```bash
npm install gray-matter@^4.0.3
```
Expected: `gray-matter` appears under `dependencies` in `package.json`; lockfile updated.

- [ ] **Step 2: Create the types** — `src/inventory/types.ts`:
```ts
export interface SkillEntry {
  /** Skill name — frontmatter `name`, else the skill directory name. */
  name: string;
  /** Frontmatter `description`; empty string if absent. */
  description: string;
  /** Origin, e.g. "superpowers@claude-plugins-official" or "user-skill". */
  source: string;
  /** Absolute path to the SKILL.md file. */
  path: string;
}

export interface Inventory {
  skills: SkillEntry[];
  /** ISO-8601 timestamp of the sweep. */
  scannedAt: string;
  /** The skills/ directories that were scanned. */
  roots: string[];
}
```

- [ ] **Step 3: Write the failing test** — `tests/inventory/parse-skill.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseSkillFile } from "../../src/inventory/parse-skill.js";

function writeSkill(dir: string, body: string): string {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, "SKILL.md");
  writeFileSync(p, body, "utf8");
  return p;
}

describe("parseSkillFile", () => {
  it("reads name and description from frontmatter", () => {
    const dir = join(tmpdir(), `sk-${Date.now()}-a`);
    const p = writeSkill(dir, `---\nname: browse\ndescription: Fast headless browser.\n---\nbody`);
    expect(parseSkillFile(p)).toEqual({ name: "browse", description: "Fast headless browser." });
  });

  it("falls back to the directory name when frontmatter name is missing", () => {
    const dir = join(tmpdir(), `sk-${Date.now()}-cso`);
    const p = writeSkill(dir, `---\ndescription: Security review.\n---\nbody`);
    expect(parseSkillFile(p)).toEqual({ name: "cso", description: "Security review." });
  });

  it("returns empty description when absent", () => {
    const dir = join(tmpdir(), `sk-${Date.now()}-x`);
    const p = writeSkill(dir, `---\nname: x\n---\nbody`);
    expect(parseSkillFile(p)).toEqual({ name: "x", description: "" });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `parse-skill.js`.

- [ ] **Step 5: Implement** — `src/inventory/parse-skill.ts`:
```ts
import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";

export interface ParsedSkill {
  name: string;
  description: string;
}

/** Parse a SKILL.md: frontmatter `name`/`description`, with directory-name fallback for name. */
export function parseSkillFile(skillMdPath: string): ParsedSkill {
  const { data } = matter(readFileSync(skillMdPath, "utf8"));
  const name =
    typeof data.name === "string" && data.name.trim()
      ? data.name.trim()
      : basename(dirname(skillMdPath));
  const description =
    typeof data.description === "string" ? data.description.trim() : "";
  return { name, description };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS (parse-skill tests + existing SP0 tests).

- [ ] **Step 7: Commit**
```bash
git add package.json package-lock.json src/inventory/types.ts src/inventory/parse-skill.ts tests/inventory/parse-skill.test.ts
git commit -m "feat: add inventory types + SKILL.md frontmatter parser"
```

---

## Task 2: Single-directory skill scanner (TDD)

**Files:** Create `src/inventory/scan-skills-dir.ts`, `tests/inventory/scan-skills-dir.test.ts`.

- [ ] **Step 1: Write the failing test** — `tests/inventory/scan-skills-dir.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanSkillsDir } from "../../src/inventory/scan-skills-dir.js";

function makeSkill(root: string, name: string, desc: string): void {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: ${desc}\n---\n`, "utf8");
}

describe("scanSkillsDir", () => {
  it("returns one entry per direct child that has a SKILL.md, and does not recurse", () => {
    const root = join(tmpdir(), `skills-${Date.now()}`);
    makeSkill(root, "browse", "Headless browser.");
    makeSkill(root, "cso", "Security review.");
    // a nested vendored sub-skill that MUST be ignored (not a direct child)
    const nested = join(root, "browse", "upstream");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, "SKILL.md"), `---\nname: upstream\n---\n`, "utf8");
    // a directory with no SKILL.md (must be skipped)
    mkdirSync(join(root, "not-a-skill"), { recursive: true });

    const entries = scanSkillsDir(root, "gstack");
    const names = entries.map((e) => e.name).sort();
    expect(names).toEqual(["browse", "cso"]);
    expect(entries.every((e) => e.source === "gstack")).toBe(true);
    expect(entries.find((e) => e.name === "browse")?.description).toBe("Headless browser.");
  });

  it("returns [] when the directory does not exist", () => {
    expect(scanSkillsDir(join(tmpdir(), `missing-${Date.now()}`), "x")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `scan-skills-dir.js`.

- [ ] **Step 3: Implement** — `src/inventory/scan-skills-dir.ts`:
```ts
import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseSkillFile } from "./parse-skill.js";
import type { SkillEntry } from "./types.js";

/**
 * Scan the DIRECT child directories of `skillsDir` for `<child>/SKILL.md`.
 * Intentionally non-recursive: this skips vendored `upstream/` sub-docs and
 * a plugin's internal nested skills.
 */
export function scanSkillsDir(skillsDir: string, source: string): SkillEntry[] {
  if (!existsSync(skillsDir)) return [];
  const entries: SkillEntry[] = [];
  for (const child of readdirSync(skillsDir)) {
    const childDir = join(skillsDir, child);
    if (!statSync(childDir).isDirectory()) continue;
    const skillMd = join(childDir, "SKILL.md");
    if (!existsSync(skillMd)) continue;
    const parsed = parseSkillFile(skillMd);
    entries.push({
      name: parsed.name,
      description: parsed.description,
      source,
      path: skillMd,
    });
  }
  return entries;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/inventory/scan-skills-dir.ts tests/inventory/scan-skills-dir.test.ts
git commit -m "feat: add single-directory skill scanner (direct children only)"
```

---

## Task 3: Location resolver (TDD with fixture config)

**Files:** Create `src/inventory/locations.ts`, `tests/fixtures/fake-claude/**`, `tests/inventory/locations.test.ts`.

- [ ] **Step 1: Create the fixture tree**

Create these files (a miniature, fake `~/.claude`):

`tests/fixtures/fake-claude/settings.json`:
```json
{
  "enabledPlugins": {
    "superpowers@official": true,
    "disabled-plugin@official": false
  }
}
```

`tests/fixtures/fake-claude/plugins/installed_plugins.json`:
```json
{
  "version": 2,
  "plugins": {
    "superpowers@official": [
      { "scope": "user", "installPath": "PLUGIN_PATH_PLACEHOLDER" }
    ],
    "disabled-plugin@official": [
      { "scope": "user", "installPath": "DISABLED_PATH_PLACEHOLDER" }
    ]
  }
}
```
> NOTE: the implementer must replace the two placeholder strings at test-setup time with absolute paths computed from the fixture root (see test below), because `installPath` is absolute in the real file. Do this by reading + rewriting the JSON in a `beforeAll`, OR (preferred) generate `installed_plugins.json` in the test setup rather than committing literal paths. The plan's test does the latter.

Create the fake plugin's published skill `tests/fixtures/fake-claude/plugins/cache/official/superpowers/1.0.0/skills/brainstorming/SKILL.md`:
```markdown
---
name: brainstorming
description: Explore ideas before building.
---
```
Create a fake user skill `tests/fixtures/fake-claude/skills/cso/SKILL.md`:
```markdown
---
name: cso
description: Security review.
---
```

- [ ] **Step 2: Write the failing test** — `tests/inventory/locations.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { resolveScanLocations } from "../../src/inventory/locations.js";

const here = dirname(fileURLToPath(import.meta.url));
const fakeHome = join(here, "../fixtures/fake-claude");
const pluginPath = join(fakeHome, "plugins/cache/official/superpowers/1.0.0");
const disabledPath = join(fakeHome, "plugins/cache/official/disabled-plugin/1.0.0");

beforeAll(() => {
  // Generate installed_plugins.json with absolute paths derived from the fixture root.
  mkdirSync(join(fakeHome, "plugins"), { recursive: true });
  writeFileSync(
    join(fakeHome, "plugins/installed_plugins.json"),
    JSON.stringify({
      version: 2,
      plugins: {
        "superpowers@official": [{ scope: "user", installPath: pluginPath }],
        "disabled-plugin@official": [{ scope: "user", installPath: disabledPath }],
      },
    }),
    "utf8",
  );
});

describe("resolveScanLocations", () => {
  it("includes enabled plugins' skills dirs and the user skills dir, excludes disabled plugins", () => {
    const locs = resolveScanLocations(fakeHome);
    const sources = locs.map((l) => l.source);
    expect(sources).toContain("superpowers@official");
    expect(sources).toContain("user-skill");
    expect(sources).not.toContain("disabled-plugin@official");

    const sp = locs.find((l) => l.source === "superpowers@official");
    expect(sp?.skillsDir).toBe(join(pluginPath, "skills"));
    const user = locs.find((l) => l.source === "user-skill");
    expect(user?.skillsDir).toBe(join(fakeHome, "skills"));
  });
});
```
> The committed `installed_plugins.json` from Step 1 is overwritten by this `beforeAll`; that's intentional (keeps absolute paths machine-independent). You may omit committing the placeholder file and rely on the generated one.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `locations.js`.

- [ ] **Step 4: Implement** — `src/inventory/locations.ts`:
```ts
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

export interface ScanLocation {
  skillsDir: string;
  source: string;
}

function readJson(path: string): unknown {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

/**
 * Resolve every skills/ directory to scan:
 *  1. Enabled cache plugins (settings.json enabledPlugins ∩ installed_plugins.json installPath)
 *  2. The user skills directory (~/.claude/skills)
 */
export function resolveScanLocations(
  claudeHome: string = join(homedir(), ".claude"),
): ScanLocation[] {
  const locations: ScanLocation[] = [];

  const settings = readJson(join(claudeHome, "settings.json")) as
    | { enabledPlugins?: Record<string, boolean> }
    | undefined;
  const installed = readJson(join(claudeHome, "plugins", "installed_plugins.json")) as
    | { plugins?: Record<string, Array<{ installPath?: string }>> }
    | undefined;

  const enabled = settings?.enabledPlugins ?? {};
  const installedPlugins = installed?.plugins ?? {};

  for (const [key, isEnabled] of Object.entries(enabled)) {
    if (!isEnabled) continue;
    const records = installedPlugins[key];
    const installPath = Array.isArray(records) ? records[0]?.installPath : undefined;
    if (typeof installPath === "string") {
      locations.push({ skillsDir: join(installPath, "skills"), source: key });
    }
  }

  locations.push({ skillsDir: join(claudeHome, "skills"), source: "user-skill" });
  return locations;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/inventory/locations.ts tests/fixtures/fake-claude tests/inventory/locations.test.ts
git commit -m "feat: resolve skill scan locations from local config (enabled plugins + user skills)"
```

---

## Task 4: Sweep orchestrator with dedup (TDD)

**Files:** Create `src/inventory/sweep.ts`, `tests/inventory/sweep.test.ts`. Reuses the Task 3 fixture.

- [ ] **Step 1: Write the failing test** — `tests/inventory/sweep.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sweepInventory } from "../../src/inventory/sweep.js";

const here = dirname(fileURLToPath(import.meta.url));
const fakeHome = join(here, "../fixtures/fake-claude");
const pluginPath = join(fakeHome, "plugins/cache/official/superpowers/1.0.0");

beforeAll(() => {
  // Ensure config + a duplicate-name skill exist for the dedup assertion.
  mkdirSync(join(fakeHome, "plugins"), { recursive: true });
  writeFileSync(
    join(fakeHome, "plugins/installed_plugins.json"),
    JSON.stringify({
      version: 2,
      plugins: { "superpowers@official": [{ scope: "user", installPath: pluginPath }] },
    }),
    "utf8",
  );
  // user skill named "brainstorming" duplicates the plugin's — must be deduped.
  const dup = join(fakeHome, "skills/brainstorming");
  mkdirSync(dup, { recursive: true });
  writeFileSync(join(dup, "SKILL.md"), `---\nname: brainstorming\ndescription: dup.\n---\n`, "utf8");
});

describe("sweepInventory", () => {
  it("merges all locations and deduplicates by name", () => {
    const inv = sweepInventory(fakeHome);
    const names = inv.skills.map((s) => s.name);
    // "brainstorming" appears in both the plugin and user skills → counted once
    expect(names.filter((n) => n === "brainstorming")).toHaveLength(1);
    expect(names).toContain("cso");
    expect(inv.roots.length).toBeGreaterThanOrEqual(2);
    expect(typeof inv.scannedAt).toBe("string");
  });
});
```
> NOTE: enable `enabledPlugins` for `superpowers@official` is already set by the Task 3 fixture `settings.json`. If Task 3's `settings.json` only enables `superpowers@official`, this test works as-is.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `sweep.js`.

- [ ] **Step 3: Implement** — `src/inventory/sweep.ts`:
```ts
import { scanSkillsDir } from "./scan-skills-dir.js";
import { resolveScanLocations } from "./locations.js";
import type { Inventory, SkillEntry } from "./types.js";

/** Sweep all skill locations into a deduplicated Inventory (first occurrence of a name wins). */
export function sweepInventory(claudeHome?: string): Inventory {
  const locations = resolveScanLocations(claudeHome);
  const seen = new Set<string>();
  const skills: SkillEntry[] = [];

  for (const loc of locations) {
    for (const entry of scanSkillsDir(loc.skillsDir, loc.source)) {
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);
      skills.push(entry);
    }
  }

  return {
    skills,
    scannedAt: new Date().toISOString(),
    roots: locations.map((l) => l.skillsDir),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/inventory/sweep.ts tests/inventory/sweep.test.ts
git commit -m "feat: add inventory sweep with name-based dedup"
```

---

## Task 5: Wire the count into the SessionStart tap (TDD) + fold SP0 review nits

**Files:** Modify `src/hooks/session-start.ts`, `src/hooks/run-session-start.ts`, `tests/session-start.test.ts`, `tests/run-session-start.int.test.ts`.

- [ ] **Step 1: Update the unit test** — replace `tests/session-start.test.ts` with:
```ts
import { describe, it, expect } from "vitest";
import { buildSessionStartOutput, ADVISOR_MARKER } from "../src/hooks/session-start.js";

describe("buildSessionStartOutput", () => {
  it("reports the skill count and the cwd", () => {
    const out = buildSessionStartOutput(
      { session_id: "t", cwd: "/tmp/project", hook_event_name: "SessionStart" },
      42,
    );
    expect(out.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(out.hookSpecificOutput.additionalContext).toContain(ADVISOR_MARKER);
    expect(out.hookSpecificOutput.additionalContext).toContain("42 skill");
    expect(out.hookSpecificOutput.additionalContext).toContain("/tmp/project");
  });

  it("falls back gracefully when cwd is missing or count is undefined", () => {
    const out = buildSessionStartOutput(
      { session_id: "t", hook_event_name: "SessionStart" } as never,
    );
    expect(out.hookSpecificOutput.additionalContext).toContain("0 skill");
    expect(out.hookSpecificOutput.additionalContext).toContain("(unknown)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `buildSessionStartOutput` does not yet accept a count / lacks fallback.

- [ ] **Step 3: Update the implementation** — replace `src/hooks/session-start.ts` with:
```ts
import type { SessionStartHookInput, HookOutput } from "../types.js";

export const ADVISOR_MARKER = "aiSkillAdvisor active";

/**
 * Build the SessionStart hook output.
 * `skillCount` comes from the inventory sweep performed by the wrapper.
 */
export function buildSessionStartOutput(
  input: SessionStartHookInput,
  skillCount?: number,
): HookOutput {
  // Runtime validation: never trust the parsed payload's shape blindly.
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : "(unknown)";
  const count = typeof skillCount === "number" && skillCount >= 0 ? skillCount : 0;

  const context =
    `${ADVISOR_MARKER}. I can see ${count} skill(s) installed in your environment. ` +
    `Working dir: ${cwd}. (SP1 — inventory awareness; the routing engine arrives in SP2.)`;

  return {
    hookSpecificOutput: {
      // Hardcoded: this builder serves the single SessionStart event we wire.
      hookEventName: "SessionStart",
      additionalContext: context,
    },
  };
}
```

- [ ] **Step 4: Update the wrapper** — replace `src/hooks/run-session-start.ts` with:
```ts
import { buildSessionStartOutput } from "./session-start.js";
import { sweepInventory } from "../inventory/sweep.js";
import type { SessionStartHookInput } from "../types.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();

  let input: SessionStartHookInput;
  try {
    input = JSON.parse(raw) as SessionStartHookInput;
  } catch {
    process.exit(0); // no/invalid stdin → non-blocking success
  }

  let count = 0;
  try {
    count = sweepInventory().skills.length;
  } catch {
    count = 0; // never let a sweep error crash the session
  }

  process.stdout.write(JSON.stringify(buildSessionStartOutput(input, count)));
  process.exit(0);
}

void main();
```

- [ ] **Step 5: Update the integration test** — replace `tests/run-session-start.int.test.ts` with:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { ADVISOR_MARKER } from "../src/hooks/session-start.js";

const here = dirname(fileURLToPath(import.meta.url));
const wrapper = resolve(here, "../dist/hooks/run-session-start.js");

describe("run-session-start wrapper (built)", () => {
  beforeAll(() => {
    if (!existsSync(wrapper)) {
      throw new Error(`Build artifact missing: ${wrapper}. Run \`npm run build\` first.`);
    }
  });

  it("emits hook JSON containing the advisor marker for a valid payload", () => {
    const input = JSON.stringify({ session_id: "x", cwd: "/tmp/p", hook_event_name: "SessionStart" });
    const out = execFileSync("node", [wrapper], { input, encoding: "utf8" });
    const parsed = JSON.parse(out);
    expect(parsed.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(parsed.hookSpecificOutput.additionalContext).toContain(ADVISOR_MARKER);
  });

  it("emits nothing and exits 0 for empty stdin (non-blocking contract)", () => {
    const out = execFileSync("node", [wrapper], { input: "", encoding: "utf8" });
    expect(out).toBe("");
  });
});
```

- [ ] **Step 6: Build + run tests to verify pass**

Run: `npm run build && npm test`
Expected: PASS (all unit + integration + inventory tests).

- [ ] **Step 7: Commit**
```bash
git add src/hooks/session-start.ts src/hooks/run-session-start.ts tests/session-start.test.ts tests/run-session-start.int.test.ts
git commit -m "feat: surface installed-skill count via SessionStart tap; fold in SP0 review nits"
```

---

## Task 6: Verify, PR, merge on green

- [ ] **Step 1: Full local verification**

Run:
```bash
npm run build && npm test
echo '{"session_id":"m","cwd":"/demo","hook_event_name":"SessionStart"}' | node dist/hooks/run-session-start.js
```
Expected: all tests pass; the manual invocation prints a context line containing `aiSkillAdvisor active` and `N skill(s)` reflecting the *real* machine inventory (sanity check — N should be a realistic count like dozens, not 0).

- [ ] **Step 2: Push + open PR**

```bash
git push -u origin feat/sp1-inventory-awareness
gh pr create --base main --head feat/sp1-inventory-awareness \
  --title "feat: SP1 inventory awareness — sweep installed skills (both locations)" \
  --body "Implements docs/superpowers/plans/2026-06-03-sp1-inventory-awareness.md. Sweeps enabled cache plugins + the user skills folder, dedups by name, and surfaces the count via the SessionStart tap. Folds in the 4 SP0 review follow-ups. Fixture-based tests."
```

- [ ] **Step 3: Wait for CI green**

```bash
gh pr checks --watch
```
Do NOT merge until green.

- [ ] **Step 4: Merge + clean up**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --prune
git branch -a
```
Expected: only `main` remains.

---

## Self-Review (plan author)

- **Spec coverage:** Covers v1 spec §2/§4 "inventory awareness" + the F1 "exhaustive sweep (cache AND non-cache)" mandate, scoped to the local read (no market registry / install — those are SP5).
- **Placeholder scan:** Real code in every step. The one literal placeholder (`installed_plugins.json` absolute paths) is explicitly resolved by generating the file in test setup — called out in the task.
- **Type consistency:** `SkillEntry`, `Inventory`, `ScanLocation`, `ParsedSkill`, `parseSkillFile`, `scanSkillsDir`, `resolveScanLocations`, `sweepInventory`, `buildSessionStartOutput(input, skillCount?)` are used consistently across tasks and tests.
- **Discipline:** single branch, no direct main commit, CI gates merge.

## Next sub-project
After SP1 merges: **SP2 — the brain** (work-type classification + routing the inventory to suggestions).
