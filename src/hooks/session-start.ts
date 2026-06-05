import type { SessionStartHookInput, HookOutput } from "../types.js";

export const ADVISOR_MARKER = "aiSkillAdvisor active";

/**
 * Build the SessionStart hook output.
 * `skillCount` comes from the inventory sweep performed by the wrapper.
 */
export function buildSessionStartOutput(
  input: SessionStartHookInput,
  skillCount?: number,
): HookOutput {
  // Runtime validation: never trust the parsed payload's shape blindly.
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : "(unknown)";
  const count = typeof skillCount === "number" && skillCount >= 0 ? skillCount : 0;

  const context =
    `${ADVISOR_MARKER}. I can see ${count} skill(s) installed in your environment. ` +
    `Working dir: ${cwd}. (SP1 — inventory awareness; the routing engine arrives in SP2.)`;

  return {
    hookSpecificOutput: {
      // Hardcoded: this builder serves the single SessionStart event we wire.
      hookEventName: "SessionStart",
      additionalContext: context,
    },
  };
}
