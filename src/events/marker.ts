import type { AdvisorEvent, AdvisorEventType } from "./types.js";

// LOG-1: skill_invoked is NEVER accepted from a marker — only the deterministic
// PreToolUse hook writes invocations. This prevents a malicious skill description
// from forging invocations to trip the (SP3b) budget or inflate usage stats.
const MARKER_TYPES: ReadonlySet<string> = new Set([
  "suggestion",
  "suggestion_accepted",
  "declined",
  "near_miss",
]);
const MAX_FIELD = 200;
const MAX_EVENTS_PER_TURN = 10;
const MARKER_RE = /<!--\s*advisor-event:\s*(\{.*?\})\s*-->/g;

function clampStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/[\r\n]+/g, " ").trim().slice(0, MAX_FIELD);
  return s.length > 0 ? s : undefined;
}

/** Parse advisor-event markers from a single assistant message (LOG-1/LOG-2). */
export function parseMarkers(
  text: string,
  sessionId: string,
  now: () => string = () => new Date().toISOString(),
): AdvisorEvent[] {
  const events: AdvisorEvent[] = [];
  if (typeof text !== "string") return events;
  MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKER_RE.exec(text)) !== null) {
    if (events.length >= MAX_EVENTS_PER_TURN) break;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(m[1]) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (!obj || typeof obj !== "object") continue;
    const type = obj.type;
    if (typeof type !== "string" || !MARKER_TYPES.has(type)) continue;
    const ev: AdvisorEvent = { type: type as AdvisorEventType, ts: now(), sessionId };
    const skill = clampStr(obj.skill);
    if (skill) ev.skill = skill;
    const workType = clampStr(obj.workType);
    if (workType) ev.workType = workType;
    const prevented = clampStr(obj.prevented);
    if (prevented) ev.prevented = prevented;
    events.push(ev);
  }
  return events;
}
