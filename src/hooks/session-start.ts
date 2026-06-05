import type { SessionStartHookInput, HookOutput } from "../types.js";

export const ADVISOR_MARKER = "aiSkillAdvisor active";

/**
 * Build the SessionStart hook output. `inventoryBlock` is the pre-formatted,
 * sanitized, untrusted-wrapped inventory string (see inventory/format.ts).
 */
export function buildSessionStartOutput(
  input: SessionStartHookInput,
  inventoryBlock?: string,
): HookOutput {
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : "(unknown)";
  const intro =
    `${ADVISOR_MARKER}. You are advised by aiSkillAdvisor for this session ` +
    `(working dir: ${cwd}). Consult the skill inventory below to suggest the right ` +
    `skill at the right moment, per your advisor instructions.`;
  const block = typeof inventoryBlock === "string" && inventoryBlock ? `\n\n${inventoryBlock}` : "";
  return {
    hookSpecificOutput: {
      // Hardcoded: this builder serves the single SessionStart event we wire.
      hookEventName: "SessionStart",
      additionalContext: `${intro}${block}`,
    },
  };
}
