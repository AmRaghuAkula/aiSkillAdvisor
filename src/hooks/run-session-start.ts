import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSessionStartOutput, profileNote } from "./session-start.js";
import { sweepInventory } from "../inventory/sweep.js";
import { formatInventory } from "../inventory/format.js";
import { readProfile } from "../profile/store.js";
import { projectKey } from "../profile/project-key.js";
import type { SessionStartHookInput } from "../types.js";

function resolveDistFile(...parts: string[]): string | undefined {
  try {
    const root = process.env.CLAUDE_PLUGIN_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    return join(root, "dist", ...parts);
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
    block = formatInventory(sweepInventory().skills);
  } catch {
    block = undefined;
  }

  let note: string | undefined;
  try {
    note = profileNote(readProfile(projectKey()));
  } catch {
    note = undefined; // profile work must never crash the session
  }

  process.stdout.write(JSON.stringify(buildSessionStartOutput(
    input,
    block,
    resolveDistFile("report", "cli.js"),
    { note, cliPath: resolveDistFile("profile", "cli.js") },
  )));
  process.exit(0);
}

void main();
