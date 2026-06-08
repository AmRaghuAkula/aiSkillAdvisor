import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { AdvisorEvent } from "./types.js";

/** Local-first log location (F7). */
export function logPath(): string {
  const base = process.env.CLAUDE_PLUGIN_DATA ?? join(homedir(), ".claude", "ai-skill-advisor");
  return join(base, "events.jsonl");
}

/** Append one event. Best-effort: never throws (LOG-4). */
export function appendEvent(ev: AdvisorEvent, path: string = logPath()): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(ev) + "\n", "utf8");
  } catch {
    /* logging must never crash the session */
  }
}

/** Read all events. Defensive: missing file → []; malformed lines skipped; never throws. */
export function readEvents(path: string = logPath()): AdvisorEvent[] {
  if (!existsSync(path)) return [];
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const out: AdvisorEvent[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const ev = JSON.parse(t) as AdvisorEvent;
      if (ev && typeof ev.type === "string") out.push(ev);
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}
