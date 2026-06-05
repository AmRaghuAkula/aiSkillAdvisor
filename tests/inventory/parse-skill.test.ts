import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseSkillFile } from "../../src/inventory/parse-skill.js";

function writeSkill(dir: string, body: string): string {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, "SKILL.md");
  writeFileSync(p, body, "utf8");
  return p;
}

describe("parseSkillFile", () => {
  it("reads name and description from frontmatter", () => {
    const dir = join(tmpdir(), `sk-${Date.now()}-a`);
    const p = writeSkill(dir, `---\nname: browse\ndescription: Fast headless browser.\n---\nbody`);
    expect(parseSkillFile(p)).toEqual({ name: "browse", description: "Fast headless browser." });
  });

  it("falls back to the directory name when frontmatter name is missing", () => {
    const dir = join(tmpdir(), `sk-${Date.now()}`, "cso");
    const p = writeSkill(dir, `---\ndescription: Security review.\n---\nbody`);
    expect(parseSkillFile(p)).toEqual({ name: "cso", description: "Security review." });
  });

  it("returns empty description when absent", () => {
    const dir = join(tmpdir(), `sk-${Date.now()}-x`);
    const p = writeSkill(dir, `---\nname: x\n---\nbody`);
    expect(parseSkillFile(p)).toEqual({ name: "x", description: "" });
  });

  it("handles a file with no frontmatter at all", () => {
    const dir = join(tmpdir(), `sk-${Date.now()}`, "plainskill");
    const p = writeSkill(dir, `# Just a heading\n\nNo frontmatter here.`);
    expect(parseSkillFile(p)).toEqual({ name: "plainskill", description: "" });
  });
});
