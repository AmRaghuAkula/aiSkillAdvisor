import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSessionStartOutput } from "./session-start.js";
import { sweepInventory } from "../inventory/sweep.js";
import { formatInventory } from "../inventory/format.js";
import type { SessionStartHookInput } from "../types.js";

/**
 * Absolute path to the bundled value-report CLI. Prefer CLAUDE_PLUGIN_ROOT (set
 * for hooks); fall back to this file's own location (dist/hooks/ -> plugin root).
 * Robust whether installed via marketplace or loaded with --plugin-dir.
 */
function resolveReportCliPath(): string | undefined {
  try {
    const root =
      process.env.CLAUDE_PLUGIN_ROOT ??
      join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    return join(root, "dist", "report", "cli.js");
  } catch {
    return undefined;
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let input: SessionStartHookInput;
  try {
    input = JSON.parse(raw) as SessionStartHookInput;
  } catch {
    process.exit(0);
  }

  let block: string | undefined;
  try {
    const inv = sweepInventory();
    block = formatInventory(inv.skills);
  } catch {
    block = undefined; // never let inventory work crash the session
  }

  process.stdout.write(JSON.stringify(buildSessionStartOutput(input, block, resolveReportCliPath())));
  process.exit(0);
}

void main();
