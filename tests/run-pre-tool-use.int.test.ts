import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
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
    expect(out.trim()).toBe("");
    const log = readFileSync(join(dataDir, "events.jsonl"), "utf8");
    expect(log).toContain('"type":"skill_invoked"');
    expect(log).toContain('"skill":"cso"');
  });

  it("asks on an immediate back-to-back repeat (L5)", () => {
    writeFileSync(join(dataDir, "events.jsonl"),
      JSON.stringify({ type: "skill_invoked", ts: "t", sessionId: "s2", skill: "cso", stateChanging: true }) + "\n", "utf8");
    const out = run({ tool_name: "Skill", tool_input: { skillName: "cso" }, session_id: "s2" });
    const parsed = JSON.parse(out);
    expect(parsed.hookSpecificOutput.permissionDecision).toBe("ask");
    expect(parsed.hookSpecificOutput.permissionDecisionReason).toMatch(/twice in a row|loop|L5/i);
  });

  it("asks before the 3rd state-changing run (L2)", () => {
    writeFileSync(join(dataDir, "events.jsonl"), [
      JSON.stringify({ type: "skill_invoked", ts: "t", sessionId: "s3", skill: "deploy", stateChanging: true }),
      JSON.stringify({ type: "skill_invoked", ts: "t", sessionId: "s3", skill: "migrate", stateChanging: true }),
    ].join("\n") + "\n", "utf8");
    const out = run({ tool_name: "Skill", tool_input: { skillName: "publish" }, session_id: "s3" });
    expect(JSON.parse(out).hookSpecificOutput.permissionDecision).toBe("ask");
  });

  it("exits cleanly and emits nothing for non-Skill tools", () => {
    const out = run({ tool_name: "Bash", tool_input: {}, session_id: "s4" });
    expect(out.trim()).toBe("");
  });
});
