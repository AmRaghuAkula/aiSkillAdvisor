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

  it("injects an absolute value-report CLI path pointing at the built CLI", () => {
    const input = JSON.stringify({ session_id: "x", cwd: "/tmp/p", hook_event_name: "SessionStart" });
    const out = execFileSync("node", [wrapper], { input, encoding: "utf8" });
    const ctx = JSON.parse(out).hookSpecificOutput.additionalContext as string;
    expect(ctx.toLowerCase()).toContain("value report");
    expect(ctx).toMatch(/dist[\\/]report[\\/]cli\.js/); // tolerant of OS path separator
  });
});
