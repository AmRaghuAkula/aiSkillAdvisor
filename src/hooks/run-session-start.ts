import { buildSessionStartOutput } from "./session-start.js";
import { sweepInventory } from "../inventory/sweep.js";
import { formatInventory } from "../inventory/format.js";
import type { SessionStartHookInput } from "../types.js";

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

  process.stdout.write(JSON.stringify(buildSessionStartOutput(input, block)));
  process.exit(0);
}

void main();
