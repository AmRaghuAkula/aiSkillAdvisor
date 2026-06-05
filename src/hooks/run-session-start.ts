import { buildSessionStartOutput } from "./session-start.js";
import { sweepInventory } from "../inventory/sweep.js";
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
    process.exit(0); // no/invalid stdin → non-blocking success
  }

  let count = 0;
  try {
    count = sweepInventory().skills.length;
  } catch {
    count = 0; // never let a sweep error crash the session
  }

  process.stdout.write(JSON.stringify(buildSessionStartOutput(input, count)));
  process.exit(0);
}

void main();
