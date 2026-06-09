import { appendEvent, readEvents } from "../events/log.js";
import { skillNameFrom, invocationEvent } from "./pre-tool-use.js";
import { evaluateBudget } from "../events/budget.js";

interface PreToolUseInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  session_id?: string;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();
  try {
    const input = JSON.parse(raw) as PreToolUseInput;
    if (input.tool_name === "Skill") {
      const sessionId = input.session_id ?? "unknown";
      const skill = skillNameFrom(input.tool_input);
      const ev = invocationEvent(skill, sessionId);

      // Decide from PRIOR events for this session, BEFORE logging the pending one.
      let decision: { action: "allow" | "ask"; reason?: string } = { action: "allow" };
      try {
        const prior = readEvents().filter((e) => e.sessionId === sessionId);
        decision = evaluateBudget(prior, { skill, stateChanging: ev.stateChanging === true });
      } catch {
        /* fail-open: never block a tool because the budget read failed (LOG-4) */
      }

      appendEvent(ev); // deterministic capture is unchanged

      if (decision.action === "ask") {
        process.stdout.write(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "ask",
            permissionDecisionReason: decision.reason,
          },
        }));
      }
    }
  } catch {
    /* never block a tool call because logging/gating failed (LOG-4) */
  }
  process.exit(0); // always exit 0; "ask" is conveyed via the JSON above
}

void main();
