import { buildSessionStartOutput } from "./session-start.js";
import type { SessionStartHookInput } from "../types.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();

  let input: SessionStartHookInput;
  try {
    input = JSON.parse(raw) as SessionStartHookInput;
  } catch {
    // No/invalid stdin — emit nothing and succeed (non-blocking, exit 0).
    process.exit(0);
  }

  const output = buildSessionStartOutput(input);
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

void main();
