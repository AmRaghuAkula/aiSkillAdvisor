import { describe, it, expect } from "vitest";
import { buildSessionStartOutput, ADVISOR_MARKER } from "../src/hooks/session-start.js";

describe("buildSessionStartOutput", () => {
  it("injects the provided inventory block and the marker", () => {
    const block = "=== INSTALLED SKILLS (UNTRUSTED DATA) ===\n- cso: Security review.\n=== END INSTALLED SKILLS ===";
    const out = buildSessionStartOutput(
      { session_id: "t", cwd: "/tmp/p", hook_event_name: "SessionStart" },
      block,
    );
    expect(out.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(out.hookSpecificOutput.additionalContext).toContain(ADVISOR_MARKER);
    expect(out.hookSpecificOutput.additionalContext).toContain("INSTALLED SKILLS");
    expect(out.hookSpecificOutput.additionalContext).toContain("cso: Security review.");
  });

  it("still emits the marker when no inventory block is provided", () => {
    const out = buildSessionStartOutput({ session_id: "t", hook_event_name: "SessionStart" } as never);
    expect(out.hookSpecificOutput.additionalContext).toContain(ADVISOR_MARKER);
  });

  it("injects the value-report CLI path when one is provided", () => {
    const out = buildSessionStartOutput(
      { session_id: "t", cwd: "/tmp/p", hook_event_name: "SessionStart" },
      undefined,
      "/home/u/.claude/plugins/cache/ai-skill-advisor/dist/report/cli.js",
    );
    const ctx = out.hookSpecificOutput.additionalContext;
    expect(ctx).toContain("/home/u/.claude/plugins/cache/ai-skill-advisor/dist/report/cli.js");
    expect(ctx.toLowerCase()).toContain("value report");
  });

  it("omits the report line when no CLI path is provided", () => {
    const out = buildSessionStartOutput(
      { session_id: "t", cwd: "/tmp/p", hook_event_name: "SessionStart" },
      undefined,
    );
    expect(out.hookSpecificOutput.additionalContext.toLowerCase()).not.toContain("value report");
  });
});
