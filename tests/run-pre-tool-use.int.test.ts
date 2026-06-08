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
