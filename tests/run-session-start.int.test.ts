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
