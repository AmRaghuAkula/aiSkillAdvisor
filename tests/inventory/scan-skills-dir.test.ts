import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanSkillsDir } from "../../src/inventory/scan-skills-dir.js";

function makeSkill(root: string, name: string, desc: string): void {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: ${desc}\n---\n`, "utf8");
}

describe("scanSkillsDir", () => {
  it("returns one entry per direct child that has a SKILL.md, and does not recurse", () => {
    const root = join(tmpdir(), `skills-${Date.now()}`);
    makeSkill(root, "browse", "Headless browser.");
    makeSkill(root, "cso", "Security review.");
    // a nested vendored sub-skill that MUST be ignored (not a direct child)
    const nested = join(root, "browse", "upstream");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, "SKILL.md"), `---\nname: upstream\n---\n`, "utf8");
    // a directory with no SKILL.md (must be skipped)
    mkdirSync(join(root, "not-a-skill"), { recursive: true });

    const entries = scanSkillsDir(root, "gstack");
    const names = entries.map((e) => e.name).sort();
    expect(names).toEqual(["browse", "cso"]);
    expect(entries.every((e) => e.source === "gstack")).toBe(true);
    expect(entries.find((e) => e.name === "browse")?.description).toBe("Headless browser.");
  });

  it("returns [] when the directory does not exist", () => {
    expect(scanSkillsDir(join(tmpdir(), `missing-${Date.now()}`), "x")).toEqual([]);
  });
});
