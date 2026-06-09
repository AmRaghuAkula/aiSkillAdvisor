import { formatInventory } from "../../src/inventory/format.js";
import { buildUserPromptSubmitOutput } from "../../src/hooks/user-prompt-submit.js";
import { extractSignals } from "../../src/signals/extract.js";
import type { SkillEntry } from "../../src/inventory/types.js";

export interface Scenario {
  id: string;
  prompt?: string;
  turns?: string[];
  inventory: Array<{ name: string; description: string }>;
  expect: string;
  mustNot?: string;
}

/** Reconstruct the exact advisor context a fresh session would see for a scenario. */
export function assembleAdvisorContext(s: Scenario): string {
  const skills: SkillEntry[] = s.inventory.map((e) => ({
    name: e.name,
    description: e.description,
    source: "eval",
    path: `/eval/${e.name}/SKILL.md`,
  }));
  const prompt = s.prompt ?? "";
  const inventoryBlock = formatInventory(skills);
  const directive = buildUserPromptSubmitOutput(extractSignals(prompt)).hookSpecificOutput.additionalContext;
  return [inventoryBlock, "", directive, "", `USER PROMPT: ${prompt}`].join("\n");
}

/** Assemble a multi-turn scenario: one shared inventory, then each user turn
 *  with its own per-prompt directive, in order. For assisted (human/model) eval. */
export function assembleMultiTurn(s: Scenario): string {
  const skills: SkillEntry[] = s.inventory.map((e) => ({
    name: e.name, description: e.description, source: "eval", path: `/eval/${e.name}/SKILL.md`,
  }));
  const parts: string[] = [formatInventory(skills), ""];
  (s.turns ?? []).forEach((prompt, i) => {
    const directive = buildUserPromptSubmitOutput(extractSignals(prompt)).hookSpecificOutput.additionalContext;
    parts.push(`=== TURN ${i + 1} ===`, directive, `USER PROMPT: ${prompt}`, "");
  });
  return parts.join("\n");
}
