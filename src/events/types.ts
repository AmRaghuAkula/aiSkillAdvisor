export type AdvisorEventType =
  | "skill_invoked"
  | "suggestion"
  | "suggestion_accepted"
  | "declined"
  | "near_miss";

export interface AdvisorEvent {
  type: AdvisorEventType;
  /** ISO-8601 */
  ts: string;
  sessionId: string;
  /** present for skill_invoked / suggestion / suggestion_accepted / declined */
  skill?: string;
  /** optional work-type tag on a suggestion */
  workType?: string;
  /** near_miss only: short brain-authored description of what was prevented */
  prevented?: string;
  /** skill_invoked only: whether the invoked skill changes state */
  stateChanging?: boolean;
}
