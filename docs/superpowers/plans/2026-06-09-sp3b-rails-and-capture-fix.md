# SP3b — Marker-Capture Fix + L2/L5 Rails + Multi-Turn Evals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the value log actually record the advisor's suggestions/near-misses (fix the broken Stop-hook capture), and turn the countable loop-prevention rails (L2 budget, L5 cycle) from AI instructions into deterministic, tested code.

**Architecture:** Three deliverables. (1) **Bug fix** — `latestAssistantText` reads Claude Code's real transcript schema (`message.role`/`message.content` array), with the regression test rewritten to the real schema. (2) **L2/L5** — a pure `src/events/budget.ts` over the session's invocation log, surfaced by the PreToolUse hook as a fail-open `ask` decision. (3) **Multi-turn evals** — extend the assisted eval harness for the one genuinely stateful brain rule (decline-then-no-repeat).

**Tech Stack:** TypeScript (NodeNext ESM) → `dist/` via `tsc`; vitest. The hooks run compiled JS via `${CLAUDE_PLUGIN_ROOT}`.

**Design basis:** `docs/superpowers/specs/2026-06-04-sp3-value-log-design.md` (SP3b = its deferred half) + the 2026-06-09 root-cause finding (recorded in `project-current-status.md`).

**Root cause (proven against the live transcript):** `src/hooks/capture-events.ts` `latestAssistantText()` checks `o.role === "assistant"` at the **top level** of each transcript line. Claude Code nests it: `o.message.role` / `o.message.content` (content is an **array** of blocks). Result: 0/1071 assistant lines matched → always returned `""` → `parseMarkers("")` → nothing captured. Verified fix: reading `message.content` recovers exactly the 2 real markers emitted in the debug session, with 0 false positives.

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/hooks/capture-events.ts` | modify | `latestAssistantText` reads nested `message.{role,content}` (real Claude Code schema), keeps flat `{role,content}` back-compat |
| `tests/capture-events.test.ts` | rewrite | exercise the **real** transcript schema (the old test encoded the wrong shape — that's why the bug shipped) |
| `src/events/budget.ts` | create | pure L2 (state-changing budget) + L5 (cycle/repeat) over session invocation events → `BudgetDecision` |
| `tests/events/budget.test.ts` | create | unit tests for L2 counting, L5 repeat, read-only exclusion, bare-name matching, empty-log allow |
| `src/hooks/run-pre-tool-use.ts` | modify | read session invocations, evaluate budget, log the invocation (unchanged), emit a fail-open `ask` when a rail trips |
| `tests/run-pre-tool-use.int.test.ts` | modify | integration: pre-seeded log → `ask` JSON; fresh session → allow (no output) |
| `tests/evals/assemble.ts` | modify | add optional `turns` to `Scenario` + `assembleMultiTurn()` |
| `tests/evals/assemble.test.ts` | modify | unit-test the multi-turn assembler |
| `tests/evals/scenarios.json` | modify | add the `decline-then-no-repeat` multi-turn scenario |
| `tests/evals/RUNNING-sp3b.md` | create | how to run the assisted multi-turn eval |

**Out of scope (unchanged):** L1/L3/L4 stay AI instructions (judgment-bound, per spec decision #4); the marker parser (`marker.ts`) is already correct; the report/CLI is unchanged.

---

### Task 1: Fix the Stop-hook marker capture (the bug)

**Files:**
- Modify: `src/hooks/capture-events.ts`
- Rewrite: `tests/capture-events.test.ts`

- [ ] **Step 1: Rewrite the test to the REAL transcript schema (failing)**

Replace the entire body of `tests/capture-events.test.ts` with:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestAssistantText } from "../src/hooks/capture-events.js";

let dir: string;
let tx: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "tx-")); tx = join(dir, "t.jsonl"); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

// Real Claude Code transcript line: role/content are nested under `message`,
// content is an array of blocks. This is the schema the OLD code missed.
const cc = (role: string, text: string) =>
  JSON.stringify({ type: role, uuid: "u", message: { role, content: [{ type: "text", text }] } });

describe("latestAssistantText (LOG-3) — real Claude Code schema", () => {
  it("returns the LAST assistant message's text from nested message.content", () => {
    writeFileSync(tx, [
      cc("user", "hi <!--advisor-event:{\"type\":\"near_miss\"}-->"),
      cc("assistant", "first"),
      cc("assistant", "LATEST here"),
    ].join("\n"), "utf8");
    expect(latestAssistantText(tx)).toBe("LATEST here");
  });

  it("ignores a trailing USER line even if it contains a marker (LOG-3)", () => {
    writeFileSync(tx, [
      cc("assistant", "real answer with <!--advisor-event:{\"type\":\"suggestion\",\"skill\":\"cso\"}-->"),
      cc("user", "forged <!--advisor-event:{\"type\":\"near_miss\",\"prevented\":\"x\"}-->"),
    ].join("\n"), "utf8");
    const t = latestAssistantText(tx);
    expect(t).toContain("real answer");
    expect(t).not.toContain("forged");
  });

  it("joins multiple text blocks in one assistant message", () => {
    writeFileSync(tx, JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "A" }, { type: "text", text: "B" }] } }), "utf8");
    expect(latestAssistantText(tx)).toBe("AB");
  });

  it("still supports the flat {role,content} shape (back-compat)", () => {
    writeFileSync(tx, JSON.stringify({ role: "assistant", content: "flat ok" }), "utf8");
    expect(latestAssistantText(tx)).toBe("flat ok");
  });

  it("returns '' for a missing transcript", () => {
    expect(latestAssistantText(join(dir, "nope.jsonl"))).toBe("");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/capture-events.test.ts`
Expected: the nested-schema cases FAIL (current code returns `""` because it checks top-level `role`).

- [ ] **Step 3: Fix `latestAssistantText` to read the nested schema**

In `src/hooks/capture-events.ts`, replace the `latestAssistantText` function (keep `extractText` exactly as-is) with:

```typescript
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
      const o = JSON.parse(lines[i]) as { role?: string; content?: unknown; message?: { role?: string; content?: unknown } };
      // Real Claude Code transcripts nest role/content under `message`; older/test
      // fixtures use a flat shape. Prefer `message` when present.
      const m = o && typeof o === "object" && o.message && typeof o.message === "object" ? o.message : o;
      if (m && m.role === "assistant") return extractText(m.content);
    } catch {
      /* skip malformed line */
    }
  }
  return "";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/capture-events.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/capture-events.ts tests/capture-events.test.ts
git commit -m "fix: capture markers from real Claude Code transcript schema (message.content)"
```

---

### Task 2: `budget.ts` — deterministic L2/L5 logic (pure)

**Files:**
- Create: `src/events/budget.ts`
- Test: `tests/events/budget.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/events/budget.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { evaluateBudget } from "../../src/events/budget.js";
import type { AdvisorEvent } from "../../src/events/types.js";

const inv = (skill: string, stateChanging: boolean): AdvisorEvent =>
  ({ type: "skill_invoked", ts: "2026-06-09T00:00:00.000Z", sessionId: "s", skill, stateChanging });

describe("evaluateBudget (L2 budget + L5 cycle)", () => {
  it("allows when there is no prior history", () => {
    expect(evaluateBudget([], { skill: "cso", stateChanging: true }).action).toBe("allow");
  });

  it("L5: asks on an immediate back-to-back repeat (same skill twice in a row)", () => {
    const d = evaluateBudget([inv("design-review", false)], { skill: "design-review", stateChanging: false });
    expect(d.action).toBe("ask");
    expect(d.reason).toMatch(/twice in a row|loop|L5/i);
  });

  it("L5: matches the bare name across plugin-qualified ids (back-to-back)", () => {
    const d = evaluateBudget([inv("gstack:design-review", false)], { skill: "design-review", stateChanging: false });
    expect(d.action).toBe("ask");
  });

  it("L5: does NOT fire when the same skill ran earlier but NOT back-to-back", () => {
    // design-review on feature A, then qa-only, now design-review on feature B — legit, not a loop
    const prior = [inv("design-review", false), inv("qa-only", false)];
    expect(evaluateBudget(prior, { skill: "design-review", stateChanging: false }).action).toBe("allow");
  });

  it("L2: allows the 1st and 2nd state-changing run, asks on the 3rd", () => {
    const prior = [inv("deploy", true), inv("migrate", true)];
    const d = evaluateBudget(prior, { skill: "publish", stateChanging: true });
    expect(d.action).toBe("ask");
    expect(d.reason).toMatch(/budget|state-changing|L2/i);
  });

  it("L2: read-only (non-state-changing) runs do not count and never trip", () => {
    const prior = [inv("brainstorming", false), inv("review", false), inv("health", false)];
    const d = evaluateBudget(prior, { skill: "qa-only", stateChanging: false });
    expect(d.action).toBe("allow");
  });

  it("L2: a read-only pending skill never trips the budget, even after 2 state-changing runs", () => {
    const prior = [inv("deploy", true), inv("migrate", true)];
    expect(evaluateBudget(prior, { skill: "qa-only", stateChanging: false }).action).toBe("allow");
  });

  it("ignores non-invocation events when counting", () => {
    const noise: AdvisorEvent[] = [
      { type: "suggestion", ts: "t", sessionId: "s", skill: "cso" },
      { type: "near_miss", ts: "t", sessionId: "s", prevented: "x" },
    ];
    expect(evaluateBudget([...noise, inv("deploy", true)], { skill: "ship", stateChanging: true }).action).toBe("allow");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/events/budget.test.ts`
Expected: FAIL ("evaluateBudget is not a function" / module missing).

- [ ] **Step 3: Implement `budget.ts`**

Create `src/events/budget.ts`:

```typescript
import type { AdvisorEvent } from "./types.js";

export interface BudgetDecision {
  action: "allow" | "ask";
  reason?: string;
}

/** Ask before the (BUDGET+1)th state-changing skill run in a session (L2). */
export const STATE_CHANGING_BUDGET = 2;

const bare = (s: string): string => (s.includes(":") ? (s.split(":").pop() as string) : s);

/**
 * Deterministic loop-prevention over a session's invocation log.
 * - L5 (cycle): the same skill is about to run BACK-TO-BACK (immediate repeat) → ask.
 *   Narrow on purpose: re-running a skill on a *different* feature later in the
 *   session is legitimate, so only an immediate repeat trips here. Broader
 *   A→B→A / per-goal cycles stay the brain's job (L5 as instruction).
 * - L2 (budget): ask before the 3rd state-changing run this session.
 * Pure + total: callers pass the session's prior events (chronological); never throws.
 */
export function evaluateBudget(
  priorSessionEvents: AdvisorEvent[],
  pending: { skill: string; stateChanging: boolean },
): BudgetDecision {
  const invocations = priorSessionEvents.filter((e) => e.type === "skill_invoked" && typeof e.skill === "string");
  const pendingBare = bare(pending.skill);

  // L5 — immediate cycle: same skill twice in a row
  const last = invocations[invocations.length - 1];
  if (last && bare(last.skill as string) === pendingBare) {
    return {
      action: "ask",
      reason: `'${pendingBare}' is about to run twice in a row — possible loop (L5). Confirm it still serves your current goal.`,
    };
  }

  // L2 — state-changing budget
  if (pending.stateChanging) {
    const priorStateChanging = invocations.filter((e) => e.stateChanging === true).length;
    if (priorStateChanging >= STATE_CHANGING_BUDGET) {
      return {
        action: "ask",
        reason: `This would be state-changing skill #${priorStateChanging + 1} this session (budget ${STATE_CHANGING_BUDGET}, L2). Confirm you want to keep going on this goal.`,
      };
    }
  }

  return { action: "allow" };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/events/budget.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/events/budget.ts tests/events/budget.test.ts
git commit -m "feat: deterministic L2 budget + L5 cycle logic (budget.ts)"
```

---

### Task 3: Wire L2/L5 into the PreToolUse hook (fail-open `ask`)

**Files:**
- Modify: `src/hooks/run-pre-tool-use.ts`
- Modify: `tests/run-pre-tool-use.int.test.ts`

> **Design (decided in eng-review — "Hybrid"):** the rail surfaces as a PreToolUse `permissionDecision: "ask"` (Claude Code's native non-allow option). **Fail-open**: any error, or no rail tripped, emits nothing and the tool proceeds. Deterministic `skill_invoked` logging is unchanged. Scope kept deliberately narrow so it doesn't nag: **L2** asks before the 3rd state-changing run; **L5** asks only on an *immediate back-to-back* repeat (not a session-wide repeat). Threshold + behavior are easy to re-tune after real use.

- [ ] **Step 1: Write the failing integration tests**

Replace `tests/run-pre-tool-use.int.test.ts` with (keeps the existing logging assertions, adds the gate):

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const wrapper = resolve(here, "../dist/hooks/run-pre-tool-use.js");

let dataDir: string;
beforeEach(() => { dataDir = mkdtempSync(join(tmpdir(), "ad-")); });
afterEach(() => { rmSync(dataDir, { recursive: true, force: true }); });

function run(payload: unknown): string {
  return execFileSync("node", [wrapper], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PLUGIN_DATA: dataDir },
  });
}

describe("run-pre-tool-use gate (built)", () => {
  it("logs the invocation and allows (no output) on a fresh session", () => {
    const out = run({ tool_name: "Skill", tool_input: { skillName: "cso" }, session_id: "s1" });
    expect(out.trim()).toBe(""); // allow = no decision emitted
    const log = readFileSync(join(dataDir, "events.jsonl"), "utf8");
    expect(log).toContain('"type":"skill_invoked"');
    expect(log).toContain('"skill":"cso"');
  });

  it("asks when the same skill already ran this session (L5)", () => {
    writeFileSync(join(dataDir, "events.jsonl"),
      JSON.stringify({ type: "skill_invoked", ts: "t", sessionId: "s2", skill: "cso", stateChanging: true }) + "\n", "utf8");
    const out = run({ tool_name: "Skill", tool_input: { skillName: "cso" }, session_id: "s2" });
    const parsed = JSON.parse(out);
    expect(parsed.hookSpecificOutput.permissionDecision).toBe("ask");
    expect(parsed.hookSpecificOutput.permissionDecisionReason).toMatch(/already run|loop|L5/i);
  });

  it("asks before the 3rd state-changing run (L2)", () => {
    writeFileSync(join(dataDir, "events.jsonl"), [
      JSON.stringify({ type: "skill_invoked", ts: "t", sessionId: "s3", skill: "deploy", stateChanging: true }),
      JSON.stringify({ type: "skill_invoked", ts: "t", sessionId: "s3", skill: "migrate", stateChanging: true }),
    ].join("\n") + "\n", "utf8");
    const out = run({ tool_name: "Skill", tool_input: { skillName: "publish" }, session_id: "s3" });
    expect(JSON.parse(out).hookSpecificOutput.permissionDecision).toBe("ask");
  });

  it("exits 0 and emits nothing for non-Skill tools", () => {
    const out = run({ tool_name: "Bash", tool_input: {}, session_id: "s4" });
    expect(out.trim()).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run build && npx vitest run tests/run-pre-tool-use.int.test.ts`
Expected: the L5/L2 cases FAIL (current wrapper emits nothing — it only logs).

- [ ] **Step 3: Implement the gate in the wrapper**

Replace `src/hooks/run-pre-tool-use.ts` with:

```typescript
import { appendEvent, readEvents } from "../events/log.js";
import { skillNameFrom, invocationEvent } from "./pre-tool-use.js";
import { evaluateBudget } from "../events/budget.js";

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
      const sessionId = input.session_id ?? "unknown";
      const skill = skillNameFrom(input.tool_input);
      const ev = invocationEvent(skill, sessionId);

      // Decide from PRIOR events for this session, before logging the pending one.
      let decision: { action: "allow" | "ask"; reason?: string } = { action: "allow" };
      try {
        const prior = readEvents().filter((e) => e.sessionId === sessionId);
        decision = evaluateBudget(prior, { skill, stateChanging: ev.stateChanging === true });
      } catch {
        /* fail-open: never block a tool because the budget read failed (LOG-4) */
      }

      appendEvent(ev); // deterministic capture is unchanged

      if (decision.action === "ask") {
        process.stdout.write(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "ask",
            permissionDecisionReason: decision.reason,
          },
        }));
      }
    }
  } catch {
    /* never block a tool call because logging/gating failed (LOG-4) */
  }
  process.exit(0); // always exit 0; "ask" is conveyed via the JSON above
}

void main();
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run build && npx vitest run tests/run-pre-tool-use.int.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/run-pre-tool-use.ts tests/run-pre-tool-use.int.test.ts
git commit -m "feat: PreToolUse surfaces L2/L5 rails as a fail-open ask decision"
```

---

### Task 4: Multi-turn eval — decline-then-no-repeat (assisted)

**Files:**
- Modify: `tests/evals/assemble.ts`
- Modify: `tests/evals/assemble.test.ts`
- Modify: `tests/evals/scenarios.json`
- Create: `tests/evals/RUNNING-sp3b.md`

> Note: the eval harness is **assisted** (assemble the context; a human/model judges against `expect`). The deterministic rails are covered by Tasks 2–3; the only genuinely stateful brain rule left to eval is decline-then-no-repeat across turns.

- [ ] **Step 1: Write the failing assembler test**

Add to `tests/evals/assemble.test.ts`:

```typescript
import { assembleMultiTurn } from "./assemble.js";

describe("assembleMultiTurn", () => {
  it("renders each turn's directive + prompt in order, sharing one inventory", () => {
    const out = assembleMultiTurn({
      id: "decline-no-repeat",
      inventory: [{ name: "cso", description: "Security review." }],
      turns: ["change the stripe billing webhook", "ok now rename a button label"],
      expect: "After the user ignores/declines the cso suggestion, it is NOT re-suggested on the next, unrelated turn.",
    });
    expect(out).toContain("INSTALLED SKILLS (UNTRUSTED DATA)");
    expect(out).toContain("TURN 1");
    expect(out).toContain("change the stripe billing webhook");
    expect(out).toContain("TURN 2");
    expect(out).toContain("rename a button label");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/evals/assemble.test.ts`
Expected: FAIL (`assembleMultiTurn` not exported).

- [ ] **Step 3: Extend the assembler**

In `tests/evals/assemble.ts`, add an optional `turns` field to `Scenario` and a new export (keep `assembleAdvisorContext` unchanged):

```typescript
export interface Scenario {
  id: string;
  prompt?: string;
  turns?: string[];
  inventory: Array<{ name: string; description: string }>;
  expect: string;
  mustNot?: string;
}

/** Assemble a multi-turn scenario: one shared inventory, then each user turn
 *  with its own per-prompt directive, in order. For assisted (human/model) eval. */
export function assembleMultiTurn(s: Scenario): string {
  const skills: SkillEntry[] = s.inventory.map((e) => ({
    name: e.name, description: e.description, source: "eval", path: `/eval/${e.name}/SKILL.md`,
  }));
  const parts: string[] = [formatInventory(skills), ""];
  (s.turns ?? []).forEach((prompt, i) => {
    const directive = buildUserPromptSubmitOutput(extractSignals(prompt)).hookSpecificOutput.additionalContext;
    parts.push(`=== TURN ${i + 1} ===`, directive, `USER PROMPT: ${prompt}`, "");
  });
  return parts.join("\n");
}
```

(The existing `assembleAdvisorContext` keeps using `s.prompt`; since `prompt` is now optional, leave that function reading `s.prompt as string` — all single-turn scenarios still provide `prompt`.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/evals/assemble.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the multi-turn scenario**

Append this object to the array in `tests/evals/scenarios.json` (note: it uses `turns`, not `prompt`):

```json
  ,{
    "id": "decline-then-no-repeat",
    "turns": [
      "I'm about to merge a change to the Stripe billing webhook",
      "thanks, now help me rename a button label in the header"
    ],
    "inventory": [{ "name": "cso", "description": "Security review for risky changes." }],
    "expect": "Turn 1 suggests cso. After the user moves on without accepting, Turn 2 (an unrelated, low-risk task) does NOT re-suggest cso.",
    "mustNot": "Re-suggests cso on Turn 2 after it was effectively declined on Turn 1."
  }
```

- [ ] **Step 6: Document the assisted run**

Create `tests/evals/RUNNING-sp3b.md`:

```markdown
# Running the SP3b multi-turn evals (assisted)

The deterministic rails (L2 budget, L5 cycle) are covered by unit/integration tests
(`tests/events/budget.test.ts`, `tests/run-pre-tool-use.int.test.ts`). The only
stateful brain behavior that needs a model in the loop is **decline-then-no-repeat**.

1. Build: `npm run build`.
2. In a Node REPL or scratch script, import `assembleMultiTurn` from
   `tests/evals/assemble.ts` and pass the `decline-then-no-repeat` scenario from
   `scenarios.json` to print the assembled multi-turn context.
3. Paste that context into a fresh Claude session (or read it as the advisor).
4. PASS if Turn 1 suggests `cso` and Turn 2 does NOT re-suggest it (the rule:
   never re-push a suggestion the user moved past), and no marker rule is violated.

Record the result (pass/fail + notes) in the PR description, same as SP2/SP3a evals.
```

- [ ] **Step 7: Verify JSON + full suite, then commit**

Run: `node -e "JSON.parse(require('fs').readFileSync('tests/evals/scenarios.json','utf8')); console.log('scenarios.json OK')"` then `npm run build && npm test`
Expected: JSON parses; all unit/integration tests pass.

```bash
git add tests/evals/assemble.ts tests/evals/assemble.test.ts tests/evals/scenarios.json tests/evals/RUNNING-sp3b.md
git commit -m "test: multi-turn eval harness + decline-then-no-repeat scenario"
```

---

### Task 5: Rebuild dist, full verification, PR

**Files:** none (integration + ship).

- [ ] **Step 1: Clean build + full suite + dist freshness**

Run:
```bash
npm ci && npm run build && npm test && git status --porcelain -- dist
```
Expected: all tests pass; `git status` for `dist` shows the rebuilt hook outputs as **modified** (we changed `capture-events`, `run-pre-tool-use`, added `budget`). Stage them.

- [ ] **Step 2: Commit the rebuilt dist**

```bash
git add dist && git commit -m "build: rebuild dist for SP3b (capture fix + budget rails)"
```
Then re-verify reproducibility: `npm run build && git status --porcelain -- dist` → **empty**.

- [ ] **Step 3: Push + open PR**

```bash
git push -u origin feat/sp3b-rails-and-capture
gh pr create --base main --title "SP3b: fix marker capture + L2/L5 rails + multi-turn eval" --body "$(cat <<'EOF'
## What
- **Fix (root-caused):** the Stop hook never captured advisor markers because `latestAssistantText` read top-level `role`/`content`; Claude Code nests them under `message` (content is an array). Now reads the real schema; test rewritten to the real schema (the old test encoded the wrong shape — that's why the bug shipped).
- **L2/L5 rails as code:** new `src/events/budget.ts` (pure) — L5 cycle (same skill re-run) + L2 state-changing budget (ask before the 3rd) — surfaced by PreToolUse as a fail-open `ask`. Deterministic skill logging unchanged.
- **Multi-turn eval:** assisted decline-then-no-repeat scenario + `assembleMultiTurn`.

Proven against the live transcript: the fixed parser recovers exactly the real markers emitted in-session, 0 false positives.

Spec: `docs/superpowers/specs/2026-06-04-sp3-value-log-design.md`
Plan: `docs/superpowers/plans/2026-06-09-sp3b-rails-and-capture-fix.md`

## Review notes
- `plan-eng-review` decided **Hybrid**: L2 asks before the 3rd state-changing run; L5 asks only on an immediate back-to-back repeat (narrowed from session-wide to avoid nagging). Fail-open. Threshold easy to re-tune.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Confirm CI green**

Run: `gh pr checks --watch`
Expected: all checks pass (incl. dist-freshness guard).

---

## Self-Review

**Spec coverage (2026-06-04 SP3 spec, SP3b half):**
- L2 budget code → Task 2/3 ✅ · L5 cycle code → Task 2/3 ✅ · "state-changing = inverse of READ_ONLY_SKILLS allowlist" → reused via `invocationEvent`'s `stateChanging` ✅ · multi-turn evals → Task 4 ✅ · L1/L3/L4 stay AI instructions → respected (out of scope) ✅ · fail-open (LOG-4) → Task 3 try/catch + tests ✅.
- Bonus (this PR): the marker-capture bug fix → Task 1 (the thing that makes SP3a's value log actually work).

**Placeholder scan:** none — every step has concrete code/commands.

**Type/name consistency:** `evaluateBudget(priorSessionEvents, {skill, stateChanging})` + `BudgetDecision{action,reason?}` defined in Task 2, used identically in Task 3. `STATE_CHANGING_BUDGET = 2` (ask on the 3rd). `latestAssistantText` signature unchanged (Task 1). `assembleMultiTurn` defined + used in Task 4. `Scenario.prompt` made optional (Task 4) — existing single-turn scenarios still set it, so `assembleAdvisorContext` is unaffected.

**Known minor:** the invocation is logged at PreToolUse even if the user then denies the `ask` (logs an "attempted" run). Pre-existing SP3a behavior; acceptable; noted for review.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | clean (decided) | 2 findings, both resolved into the plan |

**Step 0 (scope):** accepted — ~2 new files, cohesive with the value-log work; strong reuse (`READ_ONLY_SKILLS`, `invocationEvent`, `readEvents`, `extractText`, eval harness); the capture fix is root-caused + proven against the live transcript.

**Findings & resolutions:**
- **[P2] L5 over-fired** (session-wide repeat ≠ "cycle for one goal"). **Decided (Hybrid):** narrowed to an *immediate back-to-back* repeat; broader cycles stay the brain's job. Folded into `budget.ts` + tests (added a "not back-to-back ⇒ allow" test).
- **[P2] rail surfacing vs "advises, doesn't block".** **Decided (Hybrid):** PreToolUse `ask` only before the 3rd state-changing run (L2) + immediate repeats (L5); fail-open; threshold re-tunable. Not a hard deny; not naggy.

**Test coverage:** capture fix → real-schema regression test (Task 1); `budget.ts` → unit tests incl. the narrowing + read-only-pending cases (Task 2); hook gate → integration tests for allow / L5 / L2 / non-Skill (Task 3); decline-then-no-repeat → assisted multi-turn (Task 4). No new code path left untested.

**Failure modes:** budget read fails → fail-open allow (tested try/catch). Transcript unreadable/odd schema → `latestAssistantText` returns "" (no crash). No silent-failure critical gaps.

**NOT in scope:** L1/L3/L4 as code (judgment-bound — stay brain instructions) · A→B→A / per-goal cycle detection (kept as brain L5) · changing the marker parser (already correct) · report/CLI changes.

**Parallelization:** sequential — Tasks 1–3 share `src/hooks/` + `dist/`; no independent lanes.

**VERDICT: ENG CLEARED — ready to implement.** 2 findings, both resolved into the plan; 0 unresolved; 0 critical gaps.
