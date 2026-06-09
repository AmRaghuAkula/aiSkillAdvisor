import { appendEvent } from "../events/log.js";
import { skillNameFrom, invocationEvent } from "./pre-tool-use.js";
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
        if (input.tool_name === "Skill") {
            const skill = skillNameFrom(input.tool_input);
            appendEvent(invocationEvent(skill, input.session_id ?? "unknown"));
        }
    }
    catch {
        /* never block a tool call because logging failed (LOG-4) */
    }
    process.exit(0); // always allow; SP3a only logs (SP3b adds the L2/L5 gate)
}
void main();
