import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSessionStartOutput } from "./session-start.js";
import { sweepInventory } from "../inventory/sweep.js";
import { formatInventory } from "../inventory/format.js";
/**
 * Absolute path to the bundled value-report CLI. Prefer CLAUDE_PLUGIN_ROOT (set
 * for hooks); fall back to this file's own location (dist/hooks/ -> plugin root).
 * Robust whether installed via marketplace or loaded with --plugin-dir.
 */
function resolveReportCliPath() {
    try {
        const root = process.env.CLAUDE_PLUGIN_ROOT ??
            join(dirname(fileURLToPath(import.meta.url)), "..", "..");
        return join(root, "dist", "report", "cli.js");
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
        const inv = sweepInventory();
        block = formatInventory(inv.skills);
    }
    catch {
        block = undefined; // never let inventory work crash the session
    }
    process.stdout.write(JSON.stringify(buildSessionStartOutput(input, block, resolveReportCliPath())));
    process.exit(0);
}
void main();
