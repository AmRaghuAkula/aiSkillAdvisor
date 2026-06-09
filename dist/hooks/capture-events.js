import { readFileSync } from "node:fs";
function extractText(content) {
    if (typeof content === "string")
        return content;
    if (Array.isArray(content)) {
        return content
            .map((b) => (typeof b === "string" ? b : b && b.type === "text" && typeof b.text === "string" ? b.text : ""))
            .join("");
    }
    return "";
}
/** LOG-3: return ONLY the latest assistant message's text from the transcript. */
export function latestAssistantText(transcriptPath) {
    let raw;
    try {
        raw = readFileSync(transcriptPath, "utf8");
    }
    catch {
        return "";
    }
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
        try {
            const o = JSON.parse(lines[i]);
            if (o && o.role === "assistant")
                return extractText(o.content);
        }
        catch {
            /* skip malformed line */
        }
    }
    return "";
}
