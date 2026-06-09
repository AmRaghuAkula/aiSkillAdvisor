import { buildUserPromptSubmitOutput } from "./user-prompt-submit.js";
import { extractSignals } from "../signals/extract.js";
async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin)
        chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
}
async function main() {
    const raw = await readStdin();
    let input;
    try {
        input = JSON.parse(raw);
    }
    catch {
        process.exit(0);
    }
    let signals = [];
    try {
        signals = extractSignals(typeof input.prompt === "string" ? input.prompt : "");
    }
    catch {
        signals = [];
    }
    process.stdout.write(JSON.stringify(buildUserPromptSubmitOutput(signals)));
    process.exit(0);
}
void main();
