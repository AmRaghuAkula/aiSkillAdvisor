import { latestAssistantText } from "./capture-events.js";
import { parseMarkers } from "../events/marker.js";
import { appendEvent } from "../events/log.js";
async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin)
        chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
}
async function main() {
    const raw = await readStdin();
    try {
        const input = JSON.parse(raw);
        if (typeof input.transcript_path === "string") {
            const text = latestAssistantText(input.transcript_path);
            for (const ev of parseMarkers(text, input.session_id ?? "unknown"))
                appendEvent(ev);
        }
    }
    catch {
        /* capture is best-effort; never crash the session (LOG-4) */
    }
    process.exit(0);
}
void main();
