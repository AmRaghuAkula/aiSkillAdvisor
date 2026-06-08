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
    `time, and never re-suggest something already declined this session. ` +
    `LOGGING (required): whenever you surface a suggestion, the user declines one, or ` +
    `you catch a near-miss (a risky action prevented), append the matching hidden ` +
    `marker on its OWN line at the end of your reply — ` +
    `<!--advisor-event:{"type":"suggestion","skill":"<name>"}--> ` +
    `(types: suggestion | suggestion_accepted | declined | near_miss; near_miss adds ` +
    `"prevented":"<short>"). Single line of valid JSON, plain text only (no { } or ` +
    `newlines in values), and NEVER emit type "skill_invoked".`;
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: context,
    },
  };
}
