import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
function readJson(path) {
    if (!existsSync(path))
        return undefined;
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    }
    catch {
        return undefined;
    }
}
/**
 * Resolve every skills/ directory to scan:
 *  1. Enabled cache plugins (settings.json enabledPlugins ∩ installed_plugins.json installPath)
 *  2. The user skills directory (~/.claude/skills)
 */
export function resolveScanLocations(claudeHome = join(homedir(), ".claude")) {
    const locations = [];
    const settings = readJson(join(claudeHome, "settings.json"));
    const installed = readJson(join(claudeHome, "plugins", "installed_plugins.json"));
    const enabled = settings?.enabledPlugins ?? {};
    const installedPlugins = installed?.plugins ?? {};
    for (const [key, isEnabled] of Object.entries(enabled)) {
        if (!isEnabled)
            continue;
        const records = installedPlugins[key];
        const installPath = Array.isArray(records) ? records[0]?.installPath : undefined;
        if (typeof installPath === "string" && installPath.trim()) {
            locations.push({ skillsDir: join(installPath, "skills"), source: key });
        }
    }
    locations.push({ skillsDir: join(claudeHome, "skills"), source: "user-skill" });
    return locations;
}
