import { describe, it, expect } from "vitest";
import { buildSessionStartOutput, ADVISOR_MARKER } from "../src/hooks/session-start.js";

describe("buildSessionStartOutput", () => {
  it("reports the skill count and the cwd", () => {
    const out = buildSessionStartOutput(
      { session_id: "t", cwd: "/tmp/project", hook_event_name: "SessionStart" },
      42,
    );
    expect(out.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(out.hookSpecificOutput.additionalContext).toContain(ADVISOR_MARKER);
    expect(out.hookSpecificOutput.additionalContext).toContain("42 skill");
    expect(out.hookSpecificOutput.additionalContext).toContain("/tmp/project");
  });

  it("falls back gracefully when cwd is missing or count is undefined", () => {
    const out = buildSessionStartOutput(
      { session_id: "t", hook_event_name: "SessionStart" } as never,
    );
    expect(out.hookSpecificOutput.additionalContext).toContain("0 skill");
    expect(out.hookSpecificOutput.additionalContext).toContain("(unknown)");
  });
});
