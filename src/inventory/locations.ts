import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

export interface ScanLocation {
  skillsDir: string;
  source: string;
}

function readJson(path: string): unknown {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

/**
 * Resolve every skills/ directory to scan:
 *  1. Enabled cache plugins (settings.json enabledPlugins ∩ installed_plugins.json installPath)
 *  2. The user skills directory (~/.claude/skills)
 */
export function resolveScanLocations(
  claudeHome: string = join(homedir(), ".claude"),
): ScanLocation[] {
  const locations: ScanLocation[] = [];

  const settings = readJson(join(claudeHome, "settings.json")) as
    | { enabledPlugins?: Record<string, boolean> }
    | undefined;
  const installed = readJson(join(claudeHome, "plugins", "installed_plugins.json")) as
    | { plugins?: Record<string, Array<{ installPath?: string }>> }
    | undefined;

  const enabled = settings?.enabledPlugins ?? {};
  const installedPlugins = installed?.plugins ?? {};

  for (const [key, isEnabled] of Object.entries(enabled)) {
    if (!isEnabled) continue;
    const records = installedPlugins[key];
    const installPath = Array.isArray(records) ? records[0]?.installPath : undefined;
    if (typeof installPath === "string" && installPath.trim()) {
      locations.push({ skillsDir: join(installPath, "skills"), source: key });
    }
  }

  locations.push({ skillsDir: join(claudeHome, "skills"), source: "user-skill" });
  return locations;
}
