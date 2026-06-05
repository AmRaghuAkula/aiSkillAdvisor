import { describe, it, expect } from "vitest";
import { buildUserPromptSubmitOutput } from "../src/hooks/user-prompt-submit.js";

describe("buildUserPromptSubmitOutput", () => {
  it("emits an advisor directive mentioning detected signals", () => {
    const out = buildUserPromptSubmitOutput(["security", "billing"]);
    expect(out.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(out.hookSpecificOutput.additionalContext.toLowerCase()).toContain("advisor");
    expect(out.hookSpecificOutput.additionalContext).toContain("security");
  });

  it("still emits a generic directive when there are no signals", () => {
    const out = buildUserPromptSubmitOutput([]);
    expect(out.hookSpecificOutput.additionalContext.toLowerCase()).toContain("advisor");
  });
});
