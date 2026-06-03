export interface SessionStartHookInput {
  session_id: string;
  cwd: string;
  hook_event_name: string;
  /** Present on SessionStart: "startup" | "resume" | "clear" | "compact" — optional for SP0. */
  source?: string;
}

export interface HookSpecificOutput {
  hookEventName: string;
  additionalContext: string;
}

export interface HookOutput {
  hookSpecificOutput: HookSpecificOutput;
}
