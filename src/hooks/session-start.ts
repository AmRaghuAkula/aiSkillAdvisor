import type { SessionStartHookInput, HookOutput } from "../types.js";

export const ADVISOR_MARKER = "aiSkillAdvisor active";

export function buildSessionStartOutput(
  input: SessionStartHookInput,
): HookOutput {
  const context =
    `${ADVISOR_MARKER} (SP0 walking skeleton). Working dir: ${input.cwd}. ` +
    `The advising engine is not wired yet — this line only proves the ` +
    `always-on tap fires and can inject context into the session.`;

  return {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: context,
    },
  };
}
