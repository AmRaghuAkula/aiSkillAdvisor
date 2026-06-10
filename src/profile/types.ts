/** Canonical work-type tags a profile may emphasize (maps to the brain's taxonomy). */
export const WORK_TYPES = [
  "data", "security", "ai", "infra", "performance", "visual", "growth", "quality",
] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export interface Profile {
  projectKey: string;
  emphasis: WorkType[];
  sources: string[];
  ts: string;
  dismissed?: boolean;
}

const SET: ReadonlySet<string> = new Set(WORK_TYPES);

/** Pure: lowercase+trim, keep only whitelisted types, dedupe, preserve first-seen order. */
export function validateEmphasis(raw: string[]): WorkType[] {
  const out: WorkType[] = [];
  for (const r of raw) {
    const t = (typeof r === "string" ? r : "").trim().toLowerCase();
    if (SET.has(t) && !out.includes(t as WorkType)) out.push(t as WorkType);
  }
  return out;
}
