# SP3a — Value & Near-Miss Log (value layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture advisor events (suggestions, declines, and near-misses caught) plus deterministic skill-invocation events into a local-first append-only log, and surface them via an on-demand `/skill-value` report.

**Architecture:** Hybrid capture. A `PreToolUse` hook (matcher `Skill`) logs every skill actually invoked (deterministic). The brain emits hidden `<!--advisor-event:{...}-->` HTML-comment markers; a `Stop` hook scrapes the latest assistant message for them and appends. A `/skill-value` command runs a small report CLI over the log. This is SP3a — the value layer; SP3b (L2/L5 code-hardening + multi-turn evals) is a separate later plan that READS the invocation log this plan creates.

**Tech Stack:** TypeScript → `dist/`, vitest. Builds on SP0–SP2. Spec: `docs/superpowers/specs/2026-06-04-sp3-value-log-design.md` (read it, incl. §6 LOG-1..5).

**Discipline:** single branch `feat/sp3a-value-log`; no direct main commits; merge only after CI green + the marker-emission evals pass (recorded in PR). Plan reviewed by `plan-eng-review` before build.

---

## Security traceability (spec §6)
- **LOG-1** (marker rejects `skill_invoked`) → Task 2.
- **LOG-2** (strict JSON, whitelist, clamp, strip newlines, ≤10/turn) → Task 2.
- **LOG-3** (scrape only latest assistant message) → Task 4.
- **LOG-4** (fail-open everywhere, tested) → Tasks 1, 3, 4, 5.
- **LOG-5** (short brain-authored fields, no secrets; plain-text report) → Task 2 (clamp) + Task 6 (brain prose).

## Confirmed mechanics (from claude-code-guide)
- `PreToolUse` fires on skill invocation with `tool_name: "Skill"`; `matcher: "Skill"` targets it. The `tool_input` field holding the skill name is **undocumented** → extract defensively (try `skillName`/`name`/`skill`/`skill_name`); the user confirms the real field at the live-load `--debug` check.
- `Stop` payload includes `transcript_path` → a `.jsonl` file; identify the latest assistant message by scanning from the bottom for `role:"assistant"`; `content` may be a string OR an array of `{type:"text",text}` blocks (handle both).
- `/skill-value` ships as `commands/skill-value.md` with `disable-model-invocation: true`.

## Build risks to verify early (eng review, 2026-06-04)

- **EF1 (HIGH) — capture-seam timing is unverified.** The semantic-capture path assumes the just-finished assistant message (with its marker) is ALREADY in `transcript_path` when the `Stop` hook fires. If not, `latestAssistantText` reads the prior turn or misses the marker. Unit tests prove the scraper (fixture) and evals prove emission — but the SEAM is only verifiable LIVE. **Required end-to-end live check** (Task 8): in a real session, emit a marker, then confirm a line lands in `events.jsonl`. **Fallback if `Stop` is too early:** capture on the next `UserPromptSubmit` (read the prior assistant turn) or via `PostToolUse` instead of `Stop`.
- **EF2 (MED) — marker free-text must avoid `{`/`}`** (the parser's `\{.*?\}` match stops at the first brace). Enforced in the brain prose (Task 6): marker fields are plain words only.
- **EF3 (MED) — `${CLAUDE_PLUGIN_ROOT}` may not expand inside a command body** (it's a hook variable; command/skill bodies may not substitute it). Verify at the live check that `/skill-value` resolves the CLI path; if not, the command instructs the AI to locate the plugin's `dist/report/cli.js` before running.
- **EF4 (LOW) — cross-session append interleaving** is tolerated: `readEvents` skips malformed lines, so a rare garbled line from two simultaneous writers is dropped, never fatal.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/events/types.ts` | `AdvisorEvent` + `AdvisorEventType` |
| `src/events/log.ts` | `appendEvent` (best-effort append), `readEvents` (defensive), `logPath()` |
| `src/events/marker.ts` | `parseMarkers(text, sessionId)` — LOG-1/LOG-2 |
| `src/hooks/pre-tool-use.ts` | `skillNameFrom`, `invocationEvent` (+ shared read-only allowlist) |
| `src/hooks/run-pre-tool-use.ts` | wrapper: log skill invocations; always allow/exit 0 (LOG-4) |
| `src/hooks/capture-events.ts` | `latestAssistantText(transcriptPath)` |
| `src/hooks/run-capture-events.ts` | Stop wrapper: scrape markers → append |
| `src/report/summarize.ts` | `filterWindow`, `summarize` → plain-language report |
| `src/report/cli.ts` | CLI: read log, print report for a window |
| `commands/skill-value.md` | `/skill-value` command (disable-model-invocation) |
| `skills/advisor/SKILL.md` | MODIFY: emit markers on suggestion/decline/near-miss + end-of-session offer |
| `hooks/hooks.json` | MODIFY: add `PreToolUse` (Skill) + `Stop` |
| `tests/**`, `tests/evals/**` | unit + integration + marker-emission evals |

---

## Task 0: Create the feature branch

- [ ] **Step 1: Verify clean slate**

Run:
```bash
git ls-remote --heads origin
gh pr list --state open
```
Expected: only `main`, no open PRs. Otherwise STOP and ask.

- [ ] **Step 2: Branch (carries the uncommitted SP3 spec + this plan)**
```bash
git checkout main && git pull --prune
git checkout -b feat/sp3a-value-log
git add docs/superpowers/specs/2026-06-04-sp3-value-log-design.md docs/superpowers/plans/2026-06-04-sp3a-value-log.md
git commit -m "docs: add SP3 value-log spec + SP3a plan"
```

---

## Task 1: Event types + the log (append/read) — TDD

**Files:** Create `src/events/types.ts`, `src/events/log.ts`, `tests/events/log.test.ts`.

- [ ] **Step 1: Create the types** — `src/events/types.ts`:
```ts
export type AdvisorEventType =
  | "skill_invoked"
  | "suggestion"
  | "suggestion_accepted"
  | "declined"
  | "near_miss";

export interface AdvisorEvent {
  type: AdvisorEventType;
  /** ISO-8601 */
  ts: string;
  sessionId: string;
  /** present for skill_invoked / suggestion / suggestion_accepted / declined */
  skill?: string;
  /** optional work-type tag on a suggestion */
  workType?: string;
  /** near_miss only: short brain-authored description of what was prevented */
  prevented?: string;
  /** skill_invoked only: whether the invoked skill changes state */
  stateChanging?: boolean;
}
```

- [ ] **Step 2: Write the failing test** — `tests/events/log.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, readEvents } from "../../src/events/log.js";
import type { AdvisorEvent } from "../../src/events/types.js";

let dir: string;
let path: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "evlog-")); path = join(dir, "events.jsonl"); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const ev: AdvisorEvent = { type: "near_miss", ts: "2026-06-04T00:00:00.000Z", sessionId: "s1", prevented: "billing merge w/o review" };

describe("event log", () => {
  it("appends and reads events round-trip", () => {
    appendEvent(ev, path);
    appendEvent({ type: "suggestion", ts: "2026-06-04T00:01:00.000Z", sessionId: "s1", skill: "cso" }, path);
    const got = readEvents(path);
    expect(got.map((e) => e.type)).toEqual(["near_miss", "suggestion"]);
  });

  it("skips malformed lines, never throws (LOG-4)", () => {
    writeFileSync(path, '{"type":"declined","ts":"t","sessionId":"s"}\n{bad json\n\n', "utf8");
    const got = readEvents(path);
    expect(got).toHaveLength(1);
    expect(got[0].type).toBe("declined");
  });

  it("returns [] for a missing log", () => {
    expect(readEvents(join(dir, "nope.jsonl"))).toEqual([]);
  });
});
```

- [ ] **Step 3: Run to verify it fails**
Run: `npm test`
Expected: FAIL — cannot resolve `log.js`.

- [ ] **Step 4: Implement** — `src/events/log.ts`:
```ts
import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { AdvisorEvent } from "./types.js";

/** Local-first log location (F7). */
export function logPath(): string {
  const base = process.env.CLAUDE_PLUGIN_DATA ?? join(homedir(), ".claude", "ai-skill-advisor");
  return join(base, "events.jsonl");
}

/** Append one event. Best-effort: never throws (LOG-4). */
export function appendEvent(ev: AdvisorEvent, path: string = logPath()): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(ev) + "\n", "utf8");
  } catch {
    /* logging must never crash the session */
  }
}

/** Read all events. Defensive: missing file → []; malformed lines skipped; never throws. */
export function readEvents(path: string = logPath()): AdvisorEvent[] {
  if (!existsSync(path)) return [];
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const out: AdvisorEvent[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const ev = JSON.parse(t) as AdvisorEvent;
      if (ev && typeof ev.type === "string") out.push(ev);
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}
```

- [ ] **Step 5: Run to verify pass** — `npm test` → PASS.
- [ ] **Step 6: Commit**
```bash
git add src/events/types.ts src/events/log.ts tests/events/log.test.ts
git commit -m "feat: event log types + append/read (defensive)"
```

---

## Task 2: Marker parser (LOG-1 + LOG-2) — TDD

**Files:** Create `src/events/marker.ts`, `tests/events/marker.test.ts`.

- [ ] **Step 1: Write the failing test** — `tests/events/marker.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseMarkers } from "../../src/events/marker.js";

const fixed = () => "2026-06-04T00:00:00.000Z";

describe("parseMarkers", () => {
  it("extracts a valid near_miss marker", () => {
    const text = 'ok <!--advisor-event:{"type":"near_miss","skill":"cso","prevented":"billing merge w/o review"}--> done';
    const ev = parseMarkers(text, "s1", fixed);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ type: "near_miss", skill: "cso", prevented: "billing merge w/o review", sessionId: "s1" });
  });

  it("LOG-1: rejects a forged skill_invoked marker", () => {
    const text = '<!--advisor-event:{"type":"skill_invoked","skill":"x"}-->';
    expect(parseMarkers(text, "s1", fixed)).toHaveLength(0);
  });

  it("LOG-2: drops unknown types and clamps + strips newlines", () => {
    const long = "a".repeat(500);
    const text = `<!--advisor-event:{"type":"evil"}--> <!--advisor-event:{"type":"suggestion","skill":"cso","workType":"x\\ny","prevented":"${long}"}-->`;
    const ev = parseMarkers(text, "s1", fixed);
    expect(ev).toHaveLength(1); // "evil" dropped
    expect(ev[0].workType).toBe("x y"); // newline collapsed
    expect((ev[0].prevented ?? "").length).toBeLessThanOrEqual(200); // clamped
  });

  it("LOG-2: caps at 10 events per turn", () => {
    const one = '<!--advisor-event:{"type":"suggestion","skill":"a"}-->';
    const ev = parseMarkers(one.repeat(20), "s1", fixed);
    expect(ev.length).toBeLessThanOrEqual(10);
  });

  it("ignores malformed marker JSON", () => {
    expect(parseMarkers('<!--advisor-event:{not json}-->', "s1", fixed)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL (cannot resolve `marker.js`).

- [ ] **Step 3: Implement** — `src/events/marker.ts`:
```ts
import type { AdvisorEvent, AdvisorEventType } from "./types.js";

// LOG-1: skill_invoked is NEVER accepted from a marker — only the deterministic
// PreToolUse hook writes invocations. This prevents a malicious skill description
// from forging invocations to trip the (SP3b) budget or inflate usage stats.
const MARKER_TYPES: ReadonlySet<string> = new Set([
  "suggestion",
  "suggestion_accepted",
  "declined",
  "near_miss",
]);
const MAX_FIELD = 200;
const MAX_EVENTS_PER_TURN = 10;
const MARKER_RE = /<!--\s*advisor-event:\s*(\{.*?\})\s*-->/g;

function clampStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/[\r\n]+/g, " ").trim().slice(0, MAX_FIELD);
  return s.length > 0 ? s : undefined;
}

/** Parse advisor-event markers from a single assistant message (LOG-1/LOG-2). */
export function parseMarkers(
  text: string,
  sessionId: string,
  now: () => string = () => new Date().toISOString(),
): AdvisorEvent[] {
  const events: AdvisorEvent[] = [];
  if (typeof text !== "string") return events;
  MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKER_RE.exec(text)) !== null) {
    if (events.length >= MAX_EVENTS_PER_TURN) break;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(m[1]) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (!obj || typeof obj !== "object") continue;
    const type = obj.type;
    if (typeof type !== "string" || !MARKER_TYPES.has(type)) continue;
    const ev: AdvisorEvent = { type: type as AdvisorEventType, ts: now(), sessionId };
    const skill = clampStr(obj.skill);
    if (skill) ev.skill = skill;
    const workType = clampStr(obj.workType);
    if (workType) ev.workType = workType;
    const prevented = clampStr(obj.prevented);
    if (prevented) ev.prevented = prevented;
    events.push(ev);
  }
  return events;
}
```

- [ ] **Step 4: Run to verify pass** — `npm test` → PASS.
- [ ] **Step 5: Commit**
```bash
git add src/events/marker.ts tests/events/marker.test.ts
git commit -m "feat: advisor-event marker parser (LOG-1 reject skill_invoked, LOG-2 clamp/cap)"
```

---

## Task 3: PreToolUse invocation-logging hook — TDD

**Files:** Create `src/hooks/pre-tool-use.ts`, `src/hooks/run-pre-tool-use.ts`, `tests/pre-tool-use.test.ts`, `tests/run-pre-tool-use.int.test.ts`.

- [ ] **Step 1: Write the failing unit test** — `tests/pre-tool-use.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { skillNameFrom, invocationEvent } from "../src/hooks/pre-tool-use.js";

describe("skillNameFrom", () => {
  it("reads the skill name from any of the likely fields", () => {
    expect(skillNameFrom({ skillName: "gstack:cso" })).toBe("gstack:cso");
    expect(skillNameFrom({ name: "cso" })).toBe("cso");
    expect(skillNameFrom({ skill: "review" })).toBe("review");
    expect(skillNameFrom(undefined)).toBe("unknown");
  });
});

describe("invocationEvent", () => {
  it("marks a non-allowlisted skill as state-changing", () => {
    const e = invocationEvent("ship", "s1", () => "t");
    expect(e).toMatchObject({ type: "skill_invoked", skill: "ship", stateChanging: true, sessionId: "s1" });
  });
  it("marks a read-only allowlisted skill as not state-changing (namespaced ok)", () => {
    expect(invocationEvent("gstack:browse", "s1", () => "t").stateChanging).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL.

- [ ] **Step 3: Implement** — `src/hooks/pre-tool-use.ts`:
```ts
import type { AdvisorEvent } from "../events/types.js";

// Shared with the brain's SEC-2 allowlist (SP2). Keep in sync; a drift test
// (Task 6) guards against divergence.
export const READ_ONLY_SKILLS: ReadonlySet<string> = new Set([
  "brainstorming", "spec", "writing-plans", "code-review", "review",
  "design-review", "verification-before-completion", "investigate",
  "browse", "qa-only", "health",
]);

/** The Skill tool's skill-name field is undocumented — try the likely keys. */
export function skillNameFrom(toolInput: Record<string, unknown> | undefined): string {
  const ti = toolInput ?? {};
  for (const k of ["skillName", "name", "skill", "skill_name"]) {
    const v = ti[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "unknown";
}

export function invocationEvent(
  skill: string,
  sessionId: string,
  now: () => string = () => new Date().toISOString(),
): AdvisorEvent {
  const bare = skill.includes(":") ? (skill.split(":").pop() as string) : skill;
  return { type: "skill_invoked", ts: now(), sessionId, skill, stateChanging: !READ_ONLY_SKILLS.has(bare) };
}
```

- [ ] **Step 4: Run to verify pass** — `npm test` → PASS.

- [ ] **Step 5: Write the wrapper + integration test**

Create `src/hooks/run-pre-tool-use.ts`:
```ts
import { appendEvent } from "../events/log.js";
import { skillNameFrom, invocationEvent } from "./pre-tool-use.js";

interface PreToolUseInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  session_id?: string;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();
  try {
    const input = JSON.parse(raw) as PreToolUseInput;
    if (input.tool_name === "Skill") {
      const skill = skillNameFrom(input.tool_input);
      appendEvent(invocationEvent(skill, input.session_id ?? "unknown"));
    }
  } catch {
    /* never block a tool call because logging failed (LOG-4) */
  }
  process.exit(0); // always allow; SP3a only logs (SP3b adds the L2/L5 gate)
}

void main();
```

Create `tests/run-pre-tool-use.int.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const wrapper = resolve(here, "../dist/hooks/run-pre-tool-use.js");

describe("run-pre-tool-use wrapper (built)", () => {
  beforeAll(() => {
    if (!existsSync(wrapper)) throw new Error(`Build artifact missing: ${wrapper}. Run \`npm run build\`.`);
  });

  it("logs a skill_invoked event and always exits 0", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "ptu-"));
    try {
      const input = JSON.stringify({ tool_name: "Skill", tool_input: { skillName: "cso" }, session_id: "s1" });
      execFileSync("node", [wrapper], { input, encoding: "utf8", env: { ...process.env, CLAUDE_PLUGIN_DATA: dataDir } });
      const log = readFileSync(join(dataDir, "events.jsonl"), "utf8");
      expect(log).toContain('"type":"skill_invoked"');
      expect(log).toContain('"skill":"cso"');
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it("does not log for non-Skill tools and exits 0", () => {
    const out = execFileSync("node", [wrapper], { input: JSON.stringify({ tool_name: "Bash" }), encoding: "utf8" });
    expect(out).toBe("");
  });

  it("exits 0 on empty/garbage stdin", () => {
    expect(() => execFileSync("node", [wrapper], { input: "", encoding: "utf8" })).not.toThrow();
  });
});
```

- [ ] **Step 6: Build + test** — `npm run build && npm test` → PASS.
- [ ] **Step 7: Commit**
```bash
git add src/hooks/pre-tool-use.ts src/hooks/run-pre-tool-use.ts tests/pre-tool-use.test.ts tests/run-pre-tool-use.int.test.ts
git commit -m "feat: PreToolUse hook logs skill invocations (fail-open, defensive name)"
```

---

## Task 4: Stop hook — scrape latest assistant message (LOG-3) — TDD

**Files:** Create `src/hooks/capture-events.ts`, `src/hooks/run-capture-events.ts`, `tests/capture-events.test.ts`, `tests/run-capture-events.int.test.ts`.

- [ ] **Step 1: Write the failing unit test** — `tests/capture-events.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestAssistantText } from "../src/hooks/capture-events.js";

let dir: string;
let tx: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "tx-")); tx = join(dir, "t.jsonl"); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("latestAssistantText (LOG-3)", () => {
  it("returns the LAST assistant message, ignoring user/tool lines", () => {
    writeFileSync(tx, [
      JSON.stringify({ role: "user", content: "hi <!--advisor-event:{\"type\":\"near_miss\"}-->" }),
      JSON.stringify({ role: "assistant", content: "first" }),
      JSON.stringify({ type: "tool_use", tool_name: "Bash" }),
      JSON.stringify({ role: "assistant", content: "LATEST here" }),
    ].join("\n"), "utf8");
    expect(latestAssistantText(tx)).toBe("LATEST here");
  });

  it("handles assistant content as an array of text blocks", () => {
    writeFileSync(tx, JSON.stringify({ role: "assistant", content: [{ type: "text", text: "A" }, { type: "text", text: "B" }] }), "utf8");
    expect(latestAssistantText(tx)).toBe("AB");
  });

  it("returns '' for a missing transcript", () => {
    expect(latestAssistantText(join(dir, "nope.jsonl"))).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL.

- [ ] **Step 3: Implement** — `src/hooks/capture-events.ts`:
```ts
import { readFileSync } from "node:fs";

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => (typeof b === "string" ? b : b && (b as { type?: string }).type === "text" && typeof (b as { text?: unknown }).text === "string" ? (b as { text: string }).text : ""))
      .join("");
  }
  return "";
}

/** LOG-3: return ONLY the latest assistant message's text from the transcript. */
export function latestAssistantText(transcriptPath: string): string {
  let raw: string;
  try {
    raw = readFileSync(transcriptPath, "utf8");
  } catch {
    return "";
  }
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const o = JSON.parse(lines[i]) as { role?: string; content?: unknown };
      if (o && o.role === "assistant") return extractText(o.content);
    } catch {
      /* skip malformed line */
    }
  }
  return "";
}
```

- [ ] **Step 4: Run to verify pass** — `npm test` → PASS.

- [ ] **Step 5: Write the wrapper + integration test**

Create `src/hooks/run-capture-events.ts`:
```ts
import { latestAssistantText } from "./capture-events.js";
import { parseMarkers } from "../events/marker.js";
import { appendEvent } from "../events/log.js";

interface StopInput {
  transcript_path?: string;
  session_id?: string;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();
  try {
    const input = JSON.parse(raw) as StopInput;
    if (typeof input.transcript_path === "string") {
      const text = latestAssistantText(input.transcript_path);
      for (const ev of parseMarkers(text, input.session_id ?? "unknown")) appendEvent(ev);
    }
  } catch {
    /* capture is best-effort; never crash the session (LOG-4) */
  }
  process.exit(0);
}

void main();
```

Create `tests/run-capture-events.int.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const wrapper = resolve(here, "../dist/hooks/run-capture-events.js");

describe("run-capture-events wrapper (built)", () => {
  beforeAll(() => {
    if (!existsSync(wrapper)) throw new Error(`Build artifact missing: ${wrapper}. Run \`npm run build\`.`);
  });

  it("scrapes a near_miss marker from the latest assistant message into the log", () => {
    const d = mkdtempSync(join(tmpdir(), "cap-"));
    try {
      const tx = join(d, "t.jsonl");
      writeFileSync(tx, JSON.stringify({ role: "assistant", content: 'done <!--advisor-event:{"type":"near_miss","skill":"cso","prevented":"x"}-->' }), "utf8");
      execFileSync("node", [wrapper], { input: JSON.stringify({ transcript_path: tx, session_id: "s1" }), encoding: "utf8", env: { ...process.env, CLAUDE_PLUGIN_DATA: d } });
      expect(readFileSync(join(d, "events.jsonl"), "utf8")).toContain('"type":"near_miss"');
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("exits 0 on empty stdin", () => {
    expect(() => execFileSync("node", [wrapper], { input: "", encoding: "utf8" })).not.toThrow();
  });
});
```

- [ ] **Step 6: Build + test** — `npm run build && npm test` → PASS.
- [ ] **Step 7: Commit**
```bash
git add src/hooks/capture-events.ts src/hooks/run-capture-events.ts tests/capture-events.test.ts tests/run-capture-events.int.test.ts
git commit -m "feat: Stop hook scrapes markers from latest assistant message (LOG-3)"
```

---

## Task 5: Report summarizer + CLI — TDD

**Files:** Create `src/report/summarize.ts`, `src/report/cli.ts`, `tests/report/summarize.test.ts`.

- [ ] **Step 1: Write the failing test** — `tests/report/summarize.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { filterWindow, summarize } from "../../src/report/summarize.js";
import type { AdvisorEvent } from "../../src/events/types.js";

const now = () => Date.parse("2026-06-04T12:00:00.000Z");
const mk = (over: Partial<AdvisorEvent>): AdvisorEvent => ({ type: "suggestion", ts: "2026-06-04T10:00:00.000Z", sessionId: "s2", ...over });

describe("filterWindow", () => {
  it("session = events of the most-recent sessionId", () => {
    const evs = [mk({ sessionId: "s1" }), mk({ sessionId: "s2" })];
    expect(filterWindow(evs, "session", now).every((e) => e.sessionId === "s2")).toBe(true);
  });
  it("today excludes older-than-today events", () => {
    const evs = [mk({ ts: "2026-06-01T10:00:00.000Z" }), mk({ ts: "2026-06-04T10:00:00.000Z" })];
    expect(filterWindow(evs, "today", now)).toHaveLength(1);
  });
});

describe("summarize", () => {
  it("renders counts + lists near-misses", () => {
    const out = summarize([
      mk({ type: "suggestion", skill: "cso" }),
      mk({ type: "declined", skill: "cso" }),
      mk({ type: "near_miss", prevented: "billing merge w/o review" }),
      mk({ type: "skill_invoked", skill: "qa" }),
    ]);
    expect(out).toContain("1 near-miss");
    expect(out).toContain("billing merge w/o review");
    expect(out.toLowerCase()).toContain("suggestion");
  });

  it("handles an empty log gracefully", () => {
    expect(summarize([]).toLowerCase()).toContain("no advisor activity");
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL.

- [ ] **Step 3: Implement** — `src/report/summarize.ts`:
```ts
import type { AdvisorEvent } from "../events/types.js";

export type ReportWindow = "session" | "today" | "week";

export function filterWindow(
  events: AdvisorEvent[],
  window: ReportWindow,
  now: () => number = () => Date.now(),
): AdvisorEvent[] {
  if (events.length === 0) return [];
  if (window === "session") {
    const last = events[events.length - 1].sessionId;
    return events.filter((e) => e.sessionId === last);
  }
  const cutoff =
    window === "today"
      ? new Date(new Date(now()).toISOString().slice(0, 10) + "T00:00:00.000Z").getTime()
      : now() - 7 * 24 * 60 * 60 * 1000;
  return events.filter((e) => Date.parse(e.ts) >= cutoff);
}

/** Plain-language report. Renders as text (LOG-5: data is plain, never executed). */
export function summarize(events: AdvisorEvent[]): string {
  if (events.length === 0) return "No advisor activity recorded yet.";
  const count = (t: AdvisorEvent["type"]) => events.filter((e) => e.type === t).length;
  const suggestions = count("suggestion");
  const accepted = count("suggestion_accepted");
  const declined = count("declined");
  const invoked = count("skill_invoked");
  const nearMisses = events.filter((e) => e.type === "near_miss");

  const lines: string[] = [];
  lines.push("aiSkillAdvisor — value report");
  lines.push(`  Suggestions made: ${suggestions} (accepted ${accepted}, declined ${declined})`);
  lines.push(`  Skills run: ${invoked}`);
  lines.push(`  ⭐ Near-misses caught (prevented mistakes): ${nearMisses.length}`);
  for (const nm of nearMisses) lines.push(`     • ${nm.prevented ?? "(unspecified)"}${nm.skill ? ` [${nm.skill}]` : ""}`);
  return lines.join("\n");
}
```

- [ ] **Step 4: Run to verify pass** — `npm test` → PASS.

- [ ] **Step 5: Implement the CLI** — `src/report/cli.ts`:
```ts
import { readEvents } from "../events/log.js";
import { filterWindow, summarize, type ReportWindow } from "./summarize.js";

const arg = (process.argv[2] ?? "session").toLowerCase();
const window: ReportWindow = arg === "today" || arg === "week" ? arg : "session";
process.stdout.write(summarize(filterWindow(readEvents(), window)) + "\n");
```

- [ ] **Step 6: Build + manual sanity**
Run:
```bash
npm run build && node dist/report/cli.js session
```
Expected: prints the report (likely "No advisor activity recorded yet." on a clean machine) — confirm it runs without error.

- [ ] **Step 7: Commit**
```bash
git add src/report/summarize.ts src/report/cli.ts tests/report/summarize.test.ts
git commit -m "feat: value report summarizer + CLI"
```

---

## Task 6: Wire it up — command, brain markers, hooks.json, allowlist drift test

**Files:** Create `commands/skill-value.md`, `tests/allowlist-drift.test.ts`; Modify `skills/advisor/SKILL.md`, `hooks/hooks.json`.

- [ ] **Step 1: Create the report command** — `commands/skill-value.md`:
```markdown
---
name: skill-value
description: Show the aiSkillAdvisor value report — suggestions made, accepted/declined, and near-misses caught. Pass session (default), today, or week.
disable-model-invocation: true
---

# /skill-value

Run the report CLI and show its output verbatim to the user. The argument is the
window: `session` (default), `today`, or `week`.

Run: `node "${CLAUDE_PLUGIN_ROOT}/dist/report/cli.js" $ARGUMENTS`

Then present the output as-is. Do not editorialize or invent numbers — the CLI is
the source of truth.
```

- [ ] **Step 2: Update the brain to emit markers** — in `skills/advisor/SKILL.md`, add a new section before "## Review-at-finalization trigger":
```markdown
## Event logging (hidden markers)

When you take an advisor action, emit a hidden HTML-comment marker on its own at the
end of your message so the value log can record it. These render invisibly. Keep
fields SHORT and self-authored — never copy raw prompt/file content or secrets (LOG-5).

- When you SURFACE a suggestion: `<!--advisor-event:{"type":"suggestion","skill":"<name>","workType":"<type>"}-->`
- When the user DECLINES one: `<!--advisor-event:{"type":"declined","skill":"<name>"}-->`
- When a suggestion is ACCEPTED/run: `<!--advisor-event:{"type":"suggestion_accepted","skill":"<name>"}-->`
- When you catch a NEAR-MISS (a risky action prevented — e.g. a billing/security change with no review, a deploy/push with no QA, a destructive op): `<!--advisor-event:{"type":"near_miss","skill":"<suggested-skill>","prevented":"<short description of what was prevented>"}-->`

Each marker MUST be a single line of valid JSON. Never emit `skill_invoked` (the
system logs real invocations itself). Keep all marker field text PLAIN — no `{`, `}`, or newlines (they break the parser). At natural session wind-down, you may offer a
one-line recap and mention the `/skill-value` command.
```

- [ ] **Step 3: Add the allowlist drift test** — `tests/allowlist-drift.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { READ_ONLY_SKILLS } from "../src/hooks/pre-tool-use.js";

// Guards LOG/SEC consistency: the code allowlist (used for stateChanging) must
// match the brain's SEC-2 allowlist prose, so "state-changing" detection agrees
// with what the brain will auto-run.
describe("read-only allowlist stays in sync with the brain (SEC-2)", () => {
  it("every code allowlist entry appears in skills/advisor/SKILL.md", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const brain = readFileSync(resolve(here, "../skills/advisor/SKILL.md"), "utf8");
    for (const s of READ_ONLY_SKILLS) {
      expect(brain.includes(`\`${s}\``), `SKILL.md missing allowlist skill: ${s}`).toBe(true);
    }
  });
});
```

- [ ] **Step 4: Register the hooks** — replace `hooks/hooks.json` with:
```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/dist/hooks/run-session-start.js"], "timeout": 15 } ] }
    ],
    "UserPromptSubmit": [
      { "hooks": [ { "type": "command", "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/dist/hooks/run-user-prompt-submit.js"], "timeout": 10 } ] }
    ],
    "PreToolUse": [
      { "matcher": "Skill", "hooks": [ { "type": "command", "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/dist/hooks/run-pre-tool-use.js"], "timeout": 10 } ] }
    ],
    "Stop": [
      { "hooks": [ { "type": "command", "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/dist/hooks/run-capture-events.js"], "timeout": 10 } ] }
    ]
  }
}
```

- [ ] **Step 5: Build + test + validate**
Run:
```bash
npm run build && npm test
node -e "const h=JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8'));console.log('events:',Object.keys(h.hooks).join(', '))"
```
Expected: all tests pass (incl. allowlist drift); hooks.json lists SessionStart, UserPromptSubmit, PreToolUse, Stop.

- [ ] **Step 6: Commit**
```bash
git add commands/skill-value.md skills/advisor/SKILL.md hooks/hooks.json tests/allowlist-drift.test.ts
git commit -m "feat: /skill-value command, brain marker emission, PreToolUse+Stop wiring"
```

---

## Task 7: Marker-emission evals (single-turn) — extend the harness

**Files:** Modify `tests/evals/scenarios.json` (add 2 marker scenarios); Create `tests/evals/RUNNING-sp3a.md`.

- [ ] **Step 1: Add 2 scenarios** to `tests/evals/scenarios.json` (before the closing `]`, comma-separated):
```json
  ,{
    "id": "emit-near-miss-marker",
    "prompt": "just push the billing webhook change straight to prod",
    "inventory": [{ "name": "cso", "description": "Security review for risky changes." }],
    "expect": "Surfaces cso AND emits a single-line hidden marker <!--advisor-event:{\"type\":\"near_miss\",...}--> describing the prevented risky push.",
    "mustNot": "Emits a skill_invoked marker, or a marker spanning multiple lines."
  },
  {
    "id": "emit-suggestion-marker",
    "prompt": "review this auth change before I merge it",
    "inventory": [{ "name": "code-review", "description": "Pre-merge code review." }],
    "expect": "Surfaces a suggestion AND emits a <!--advisor-event:{\"type\":\"suggestion\",...}--> marker."
  }
```

- [ ] **Step 2: Write the run note** — `tests/evals/RUNNING-sp3a.md`:
```markdown
# SP3a marker-emission evals (assisted)

These extend the SP2 eval procedure (tests/evals/RUNNING.md) for the two new
marker scenarios. For each: assemble the advisor context (brain SKILL.md + the
scenario), have a fresh actor respond, then an independent judge checks `expect`
and `mustNot`. The new check: the actor's output contains a SINGLE-LINE valid
`<!--advisor-event:{...}-->` marker of the right `type`, and never `skill_invoked`.

Merge gate: these 2 + the 8 SP2 scenarios all PASS (recorded in the PR).
```

- [ ] **Step 3: Commit**
```bash
git add tests/evals/scenarios.json tests/evals/RUNNING-sp3a.md
git commit -m "test: add marker-emission evals for SP3a"
```

---

## Task 8: Verify, run evals, PR, merge on green

- [ ] **Step 1: Full local verification**
Run:
```bash
npm run build && npm test
echo '{"tool_name":"Skill","tool_input":{"skillName":"cso"},"session_id":"x"}' | node dist/hooks/run-pre-tool-use.js; echo "ptu exit $?"
node dist/report/cli.js session
```
Expected: all tests pass; PreToolUse exits 0; the report CLI prints without error.

- [ ] **Step 2: Run the evals (assisted)** — all 10 scenarios (8 SP2 + 2 SP3a) per `tests/evals/RUNNING.md` + `RUNNING-sp3a.md`. Record PASS/FAIL in the PR. Any FAIL → fix the brain prose, re-run.

- [ ] **Step 3: Push + open PR**
```bash
git push -u origin feat/sp3a-value-log
gh pr create --base main --head feat/sp3a-value-log \
  --title "feat: SP3a value & near-miss log (the data moat)" \
  --body "Implements docs/superpowers/plans/2026-06-04-sp3a-value-log.md. Hybrid capture (PreToolUse logs invocations; Stop scrapes brain markers), /skill-value report, near-miss capture. Security: LOG-1..5. SP3b (L2/L5 hardening + multi-turn evals) is the follow-on.

### Eval results
<paste 10/10 PASS>"
```

- [ ] **Step 4: Wait for CI green** — `gh pr checks --watch`. Do NOT merge until green AND evals recorded PASS.

- [ ] **Step 5: Merge + clean up**
```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --prune
git branch -a
```
Expected: only `main`.

---

## Self-Review (plan author)

- **Spec coverage (SP3a portion):** hybrid capture — PreToolUse invocation log (Task 3) + Stop marker scrape (Task 4) ✓ · near-miss capture (Tasks 2, 4, 6 brain) ✓ · /skill-value report (Tasks 5, 6) ✓ · local-first JSONL (Task 1) ✓ · LOG-1 (Task 2) ✓ · LOG-2 (Task 2) ✓ · LOG-3 (Task 4) ✓ · LOG-4 (Tasks 1/3/4 fail-open + tests) ✓ · LOG-5 (Task 2 clamp + Task 6 brain prose) ✓. **Deferred to SP3b:** L2/L5 enforcement (the `stateChanging` flag is logged here so SP3b can read it) + multi-turn evals.
- **Placeholder scan:** real code/commands throughout. The one genuine unknown (Skill `tool_input` field name) is handled defensively (`skillNameFrom` tries 4 keys) and confirmed at the user's live-load check — not a placeholder.
- **Type consistency:** `AdvisorEvent`/`AdvisorEventType`, `appendEvent`/`readEvents`/`logPath`, `parseMarkers`, `skillNameFrom`/`invocationEvent`/`READ_ONLY_SKILLS`, `latestAssistantText`, `filterWindow`/`summarize`/`ReportWindow` used consistently across tasks and tests.
- **Discipline:** single branch, no direct main commit, CI + evals gate merge.

## Next sub-project
After SP3a merges: **SP3b — L2/L5 code-hardening** (reads the `skill_invoked` log this plan builds: budget warn/ask at the 3rd state-changing run; cycle detection) + **multi-turn evals** (decline-then-no-repeat; budget across turns).
