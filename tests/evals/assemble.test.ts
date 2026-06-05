import { describe, it, expect } from "vitest";
import { assembleAdvisorContext } from "./assemble.js";

describe("assembleAdvisorContext", () => {
  it("produces the SessionStart inventory block + per-prompt directive + the prompt", () => {
    const out = assembleAdvisorContext({
      id: "x",
      prompt: "change the stripe billing webhook",
      inventory: [{ name: "cso", description: "Security review." }],
      expect: "...",
    });
    expect(out).toContain("INSTALLED SKILLS (UNTRUSTED DATA)");
    expect(out).toContain("cso: Security review.");
    expect(out).toContain("aiSkillAdvisor:");
    expect(out).toContain("change the stripe billing webhook");
    expect(out).toContain("billing");
  });
});
