import { buildUserPromptSubmitOutput } from "./user-prompt-submit.js";
import { extractSignals } from "../signals/extract.js";

interface UserPromptSubmitInput {
  prompt?: string;
  hook_event_name?: string;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let input: UserPromptSubmitInput;
  try {
    input = JSON.parse(raw) as UserPromptSubmitInput;
  } catch {
    process.exit(0);
  }
  let signals: string[] = [];
  try {
    signals = extractSignals(typeof input.prompt === "string" ? input.prompt : "");
  } catch {
    signals = [];
  }
  process.stdout.write(JSON.stringify(buildUserPromptSubmitOutput(signals)));
  process.exit(0);
}

void main();
