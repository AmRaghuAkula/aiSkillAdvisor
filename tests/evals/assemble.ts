import { formatInventory } from "../../src/inventory/format.js";
import { buildUserPromptSubmitOutput } from "../../src/hooks/user-prompt-submit.js";
import { extractSignals } from "../../src/signals/extract.js";
import type { SkillEntry } from "../../src/inventory/types.js";

export interface Scenario {
  id: string;
  prompt: string;
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
  const inventoryBlock = formatInventory(skills);
  const directive = buildUserPromptSubmitOutput(extractSignals(s.prompt)).hookSpecificOutput.additionalContext;
  return [inventoryBlock, "", directive, "", `USER PROMPT: ${s.prompt}`].join("\n");
}
