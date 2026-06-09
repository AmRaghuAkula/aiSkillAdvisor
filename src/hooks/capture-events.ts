import { readFileSync } from "node:fs";

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => (typeof b === "string" ? b : b && (b as { type?: string }).type === "text" && typeof (b as { text?: unknown }).text === "string" ? (b as { text: string }).text : ""))
      .join("");
  }
  return "";
}

/** LOG-3: return ONLY the latest assistant message's text from the transcript. */
export function latestAssistantText(transcriptPath: string): string {
  let raw: string;
  try {
    raw = readFileSync(transcriptPath, "utf8");
  } catch {
    return "";
  }
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const o = JSON.parse(lines[i]) as { role?: string; content?: unknown; message?: { role?: string; content?: unknown } };
      // Real Claude Code transcripts nest role/content under `message`; older/test
      // fixtures use a flat shape. Prefer `message` when present.
      const m = o && typeof o === "object" && o.message && typeof o.message === "object" ? o.message : o;
      if (m && m.role === "assistant") return extractText(m.content);
    } catch {
      /* skip malformed line */
    }
  }
  return "";
}
