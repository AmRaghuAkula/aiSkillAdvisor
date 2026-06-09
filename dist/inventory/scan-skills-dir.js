import { readdirSync, existsSync, statSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { parseSkillFile } from "./parse-skill.js";
/**
 * Scan the DIRECT child directories of `skillsDir` for `<child>/SKILL.md`.
 * Non-recursive (skips vendored `upstream/` + internal nesting). SEC-5:
 * skips symlinked children (no traversal) and never throws on a vanished entry.
 */
export function scanSkillsDir(skillsDir, source) {
    if (!existsSync(skillsDir))
        return [];
    let children;
    try {
        children = readdirSync(skillsDir);
    }
    catch {
        return [];
    }
    const entries = [];
    for (const child of children) {
        const childDir = join(skillsDir, child);
        try {
            // SEC-5: do not follow symlinked directories.
            if (lstatSync(childDir).isSymbolicLink())
                continue;
            const st = statSync(childDir, { throwIfNoEntry: false });
            if (!st || !st.isDirectory())
                continue;
        }
        catch {
            continue; // entry vanished or unreadable mid-scan — skip, never throw
        }
        const skillMd = join(childDir, "SKILL.md");
        if (!existsSync(skillMd))
            continue;
        const parsed = parseSkillFile(skillMd);
        entries.push({ name: parsed.name, description: parsed.description, source, path: skillMd });
    }
    return entries;
}
