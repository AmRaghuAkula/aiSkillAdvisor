import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveScanLocations } from "../../src/inventory/locations.js";

let home: string;
let pluginPath: string;

beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), "fake-claude-loc-"));
  pluginPath = join(home, "plugins/cache/official/superpowers/1.0.0");

  writeFileSync(
    join(home, "settings.json"),
    JSON.stringify({
      enabledPlugins: { "superpowers@official": true, "disabled-plugin@official": false },
    }),
    "utf8",
  );

  mkdirSync(join(home, "plugins"), { recursive: true });
  writeFileSync(
    join(home, "plugins/installed_plugins.json"),
    JSON.stringify({
      version: 2,
      plugins: {
        "superpowers@official": [{ scope: "user", installPath: pluginPath }],
        "disabled-plugin@official": [
          { scope: "user", installPath: join(home, "plugins/cache/official/disabled-plugin/1.0.0") },
        ],
      },
    }),
    "utf8",
  );

  mkdirSync(join(home, "skills"), { recursive: true });
});

afterAll(() => {
  rmSync(home, { recursive: true, force: true });
});

describe("resolveScanLocations", () => {
  it("includes enabled plugins' skills dirs and the user skills dir, excludes disabled plugins", () => {
    const locs = resolveScanLocations(home);
    const sources = locs.map((l) => l.source);
    expect(sources).toContain("superpowers@official");
    expect(sources).toContain("user-skill");
    expect(sources).not.toContain("disabled-plugin@official");

    expect(locs.find((l) => l.source === "superpowers@official")?.skillsDir).toBe(
      join(pluginPath, "skills"),
    );
    expect(locs.find((l) => l.source === "user-skill")?.skillsDir).toBe(join(home, "skills"));
  });

  it("returns only the user skills dir when config is absent", () => {
    const empty = mkdtempSync(join(tmpdir(), "fake-claude-empty-"));
    try {
      const locs = resolveScanLocations(empty);
      expect(locs).toEqual([{ skillsDir: join(empty, "skills"), source: "user-skill" }]);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
