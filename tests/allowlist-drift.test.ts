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
