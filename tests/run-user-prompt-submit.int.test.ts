import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const wrapper = resolve(here, "../dist/hooks/run-user-prompt-submit.js");

describe("run-user-prompt-submit wrapper (built)", () => {
  beforeAll(() => {
    if (!existsSync(wrapper)) throw new Error(`Build artifact missing: ${wrapper}. Run \`npm run build\`.`);
  });

  it("extracts signals from the prompt and emits a directive", () => {
    const input = JSON.stringify({ prompt: "change the stripe billing webhook", hook_event_name: "UserPromptSubmit" });
    const out = execFileSync("node", [wrapper], { input, encoding: "utf8" });
    const parsed = JSON.parse(out);
    expect(parsed.hookSpecificOutput.additionalContext).toContain("billing");
  });

  it("emits nothing and exits 0 for empty stdin", () => {
    expect(execFileSync("node", [wrapper], { input: "", encoding: "utf8" })).toBe("");
  });
});
