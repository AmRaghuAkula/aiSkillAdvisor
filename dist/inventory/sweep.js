import { scanSkillsDir } from "./scan-skills-dir.js";
import { resolveScanLocations } from "./locations.js";
/** Sweep all skill locations into a deduplicated Inventory (first occurrence of a name wins). */
export function sweepInventory(claudeHome) {
    const locations = resolveScanLocations(claudeHome);
    const seen = new Set();
    const skills = [];
    for (const loc of locations) {
        for (const entry of scanSkillsDir(loc.skillsDir, loc.source)) {
            if (seen.has(entry.name))
                continue;
            seen.add(entry.name);
            skills.push(entry);
        }
    }
    return {
        skills,
        scannedAt: new Date().toISOString(),
        roots: locations.map((l) => l.skillsDir),
    };
}
