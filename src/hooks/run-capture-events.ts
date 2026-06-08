import { latestAssistantText } from "./capture-events.js";
import { parseMarkers } from "../events/marker.js";
import { appendEvent } from "../events/log.js";

interface StopInput {
  transcript_path?: string;
  session_id?: string;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();
  try {
    const input = JSON.parse(raw) as StopInput;
    if (typeof input.transcript_path === "string") {
      const text = latestAssistantText(input.transcript_path);
      for (const ev of parseMarkers(text, input.session_id ?? "unknown")) appendEvent(ev);
    }
  } catch {
    /* capture is best-effort; never crash the session (LOG-4) */
  }
  process.exit(0);
}

void main();
