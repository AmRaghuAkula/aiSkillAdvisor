import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(resolve(here, p), "utf8");

describe("advisor-tune command + brain rule", () => {
  it("command exists, is user-invoked, treats sources as untrusted, and calls the profile CLI", () => {
    const cmd = read("../commands/advisor-tune.md");
    expect(cmd).toContain("disable-model-invocation: true");
    expect(cmd.toLowerCase()).toContain("untrusted"); // SEC-1 posture on read files
    expect(cmd).toContain("dist/profile/cli.js"); // invokes the CLI (with fallback)
    expect(cmd.toLowerCase()).toContain("consent");
    expect(cmd.toLowerCase()).toContain("only side effect"); // PROFILE-2: bounded side effects
  });
  it("the brain documents the soft-lean (never-suppress) rule", () => {
    const brain = read("../skills/advisor/SKILL.md");
    expect(brain.toLowerCase()).toContain("profile emphasis");
    expect(brain.toLowerCase()).toContain("never suppress");
  });
});
