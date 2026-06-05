export interface SkillEntry {
  /** Skill name — frontmatter `name`, else the skill directory name. */
  name: string;
  /** Frontmatter `description`; empty string if absent. */
  description: string;
  /** Origin, e.g. "superpowers@claude-plugins-official" or "user-skill". */
  source: string;
  /** Absolute path to the SKILL.md file. */
  path: string;
}

export interface Inventory {
  skills: SkillEntry[];
  /** ISO-8601 timestamp of the sweep. */
  scannedAt: string;
  /** The skills/ directories that were scanned. */
  roots: string[];
}
