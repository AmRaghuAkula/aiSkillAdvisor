import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sweepInventory } from "../../src/inventory/sweep.js";

let home: string;

function writeSkill(dir: string, name: string, desc: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: ${desc}\n---\n`, "utf8");
}

beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), "fake-claude-sweep-"));
  const pluginPath = join(home, "plugins/cache/official/superpowers/1.0.0");

  writeFileSync(
    join(home, "settings.json"),
    JSON.stringify({ enabledPlugins: { "superpowers@official": true } }),
    "utf8",
  );
  mkdirSync(join(home, "plugins"), { recursive: true });
  writeFileSync(
    join(home, "plugins/installed_plugins.json"),
    JSON.stringify({
      version: 2,
      plugins: { "superpowers@official": [{ scope: "user", installPath: pluginPath }] },
    }),
    "utf8",
  );

  // plugin skill
  writeSkill(join(pluginPath, "skills/brainstorming"), "brainstorming", "Explore ideas.");
  // user skills: a duplicate "brainstorming" (must dedupe) + a unique "cso"
  writeSkill(join(home, "skills/brainstorming"), "brainstorming", "dup.");
  writeSkill(join(home, "skills/cso"), "cso", "Security review.");
});

afterAll(() => {
  rmSync(home, { recursive: true, force: true });
});

describe("sweepInventory", () => {
  it("merges all locations and deduplicates by name", () => {
    const inv = sweepInventory(home);
    const names = inv.skills.map((s) => s.name);
    expect(names.filter((n) => n === "brainstorming")).toHaveLength(1);
    expect(names).toContain("cso");
    expect(inv.roots.length).toBeGreaterThanOrEqual(2);
    expect(typeof inv.scannedAt).toBe("string");
  });
});
