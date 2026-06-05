import type { HookOutput } from "../types.js";

/**
 * Per-prompt advisor directive. The inventory is already in context from
 * SessionStart, so this is a short nudge (kept cheap). `signals` are hints only.
 */
export function buildUserPromptSubmitOutput(signals: string[]): HookOutput {
  const hint =
    signals.length > 0
      ? `Detected work-type hints: ${signals.join(", ")}. `
      : "";
  const context =
    `aiSkillAdvisor: ${hint}Check whether an installed skill (see the SessionStart ` +
    `inventory) fits this request. Default to SILENCE; only if one CLEARLY fits, ` +
    `surface ONE plain-language suggestion per your advisor instructions — one at a ` +
    `time, and never re-suggest something already declined this session.`;
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: context,
    },
  };
}
