import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseSkillFile } from "./parse-skill.js";
import type { SkillEntry } from "./types.js";

/**
 * Scan the DIRECT child directories of `skillsDir` for `<child>/SKILL.md`.
 * Intentionally non-recursive: this skips vendored `upstream/` sub-docs and
 * a plugin's internal nested skills.
 */
export function scanSkillsDir(skillsDir: string, source: string): SkillEntry[] {
  if (!existsSync(skillsDir)) return [];
  const entries: SkillEntry[] = [];
  for (const child of readdirSync(skillsDir)) {
    const childDir = join(skillsDir, child);
    if (!statSync(childDir).isDirectory()) continue;
    const skillMd = join(childDir, "SKILL.md");
    if (!existsSync(skillMd)) continue;
    const parsed = parseSkillFile(skillMd);
    entries.push({
      name: parsed.name,
      description: parsed.description,
      source,
      path: skillMd,
    });
  }
  return entries;
}
