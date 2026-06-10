import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSessionStartOutput, profileNote } from "./session-start.js";
import { sweepInventory } from "../inventory/sweep.js";
import { formatInventory } from "../inventory/format.js";
import { readProfile } from "../profile/store.js";
import { projectKey } from "../profile/project-key.js";
function resolveDistFile(...parts) {
    try {
        const root = process.env.CLAUDE_PLUGIN_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "..", "..");
        return join(root, "dist", ...parts);
    }
    catch {
        return undefined;
    }
}
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
    let block;
    try {
        block = formatInventory(sweepInventory().skills);
    }
    catch {
        block = undefined;
    }
    let note;
    try {
        note = profileNote(readProfile(projectKey()));
    }
    catch {
        note = undefined; // profile work must never crash the session
    }
    process.stdout.write(JSON.stringify(buildSessionStartOutput(input, block, resolveDistFile("report", "cli.js"), { note, cliPath: resolveDistFile("profile", "cli.js") })));
    process.exit(0);
}
void main();
