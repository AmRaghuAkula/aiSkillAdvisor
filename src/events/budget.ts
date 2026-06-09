import type { AdvisorEvent } from "./types.js";

export interface BudgetDecision {
  action: "allow" | "ask";
  reason?: string;
}

/** Ask before the (BUDGET+1)th state-changing skill run in a session (L2). */
export const STATE_CHANGING_BUDGET = 2;

const bare = (s: string): string => (s.includes(":") ? (s.split(":").pop() as string) : s);

/**
 * Deterministic loop-prevention over a session's invocation log.
 * - L5 (cycle): the same skill is about to run BACK-TO-BACK (immediate repeat) -> ask.
 *   Narrow on purpose: re-running a skill on a different feature later in the
 *   session is legitimate, so only an immediate repeat trips here. Broader
 *   A->B->A / per-goal cycles stay the brain's job (L5 as instruction).
 * - L2 (budget): ask before the 3rd state-changing run this session.
 * Pure + total: callers pass the session's prior events (chronological); never throws.
 */
export function evaluateBudget(
  priorSessionEvents: AdvisorEvent[],
  pending: { skill: string; stateChanging: boolean },
): BudgetDecision {
  const invocations = priorSessionEvents.filter((e) => e.type === "skill_invoked" && typeof e.skill === "string");
  const pendingBare = bare(pending.skill);

  // L5 — immediate cycle: same skill twice in a row
  const last = invocations[invocations.length - 1];
  if (last && bare(last.skill as string) === pendingBare) {
    return {
      action: "ask",
      reason: `'${pendingBare}' is about to run twice in a row — possible loop (L5). Confirm it still serves your current goal.`,
    };
  }

  // L2 — state-changing budget
  if (pending.stateChanging) {
    const priorStateChanging = invocations.filter((e) => e.stateChanging === true).length;
    if (priorStateChanging >= STATE_CHANGING_BUDGET) {
      return {
        action: "ask",
        reason: `This would be state-changing skill #${priorStateChanging + 1} this session (budget ${STATE_CHANGING_BUDGET}, L2). Confirm you want to keep going on this goal.`,
      };
    }
  }

  return { action: "allow" };
}
