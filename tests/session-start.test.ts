import { describe, it, expect } from "vitest";
import {
  buildSessionStartOutput,
  ADVISOR_MARKER,
} from "../src/hooks/session-start.js";

describe("buildSessionStartOutput", () => {
  it("returns a SessionStart hook output that injects the advisor marker", () => {
    const out = buildSessionStartOutput({
      session_id: "test-123",
      cwd: "/tmp/project",
      hook_event_name: "SessionStart",
    });

    expect(out.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(out.hookSpecificOutput.additionalContext).toContain(ADVISOR_MARKER);
    expect(out.hookSpecificOutput.additionalContext).toContain("/tmp/project");
  });
});
