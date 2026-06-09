import { describe, it, expect } from "vitest";
import { buildSessionStartOutput, ADVISOR_MARKER, profileNote } from "../src/hooks/session-start.js";
import type { Profile } from "../src/profile/types.js";

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

describe("profileNote", () => {
  const base: Profile = { projectKey: "/p", emphasis: [], sources: [], ts: "t" };
  it("emphasis present → a soft-lean hint naming the work-types", () => {
    const note = profileNote({ ...base, emphasis: ["security", "data"] });
    expect(note?.toLowerCase()).toContain("security");
    expect(note?.toLowerCase()).toContain("never suppress");
  });
  it("no profile → the /advisor-tune nudge", () => {
    expect(profileNote(undefined)?.toLowerCase()).toContain("/advisor-tune");
  });
  it("dismissed → no note (silent)", () => {
    expect(profileNote({ ...base, dismissed: true })).toBeUndefined();
  });
  it("PROFILE-3: injects ONLY emphasis, never the sources field", () => {
    const note = profileNote({ ...base, emphasis: ["security"], sources: ["SECRET-SOURCE-NAME"] });
    expect(note).not.toContain("SECRET-SOURCE-NAME");
  });
});

describe("buildSessionStartOutput profile", () => {
  it("injects the profile note + tune CLI path when provided", () => {
    const out = buildSessionStartOutput(
      { session_id: "t", cwd: "/p", hook_event_name: "SessionStart" },
      undefined, undefined,
      { note: "Profile: this project emphasizes security.", cliPath: "/x/dist/profile/cli.js" },
    );
    const ctx = out.hookSpecificOutput.additionalContext;
    expect(ctx).toContain("emphasizes security");
    expect(ctx).toContain("/x/dist/profile/cli.js");
  });
});
