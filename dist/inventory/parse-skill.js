import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
/** Parse a SKILL.md: frontmatter `name`/`description`, with directory-name fallback for name. */
export function parseSkillFile(skillMdPath) {
    const { data } = matter(readFileSync(skillMdPath, "utf8"));
    const name = typeof data.name === "string" && data.name.trim()
        ? data.name.trim()
        : basename(dirname(skillMdPath));
    const description = typeof data.description === "string" ? data.description.trim() : "";
    return { name, description };
}
