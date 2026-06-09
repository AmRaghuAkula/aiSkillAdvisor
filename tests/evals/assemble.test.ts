import { describe, it, expect } from "vitest";
import { assembleAdvisorContext, assembleMultiTurn } from "./assemble.js";

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
