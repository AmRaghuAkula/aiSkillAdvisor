import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { projectKey } from "../../src/profile/project-key.js";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "pk-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

describe("projectKey", () => {
  it("returns the nearest ancestor containing .git", () => {
    mkdirSync(join(root, ".git"));
    const nested = join(root, "a", "b");
    mkdirSync(nested, { recursive: true });
    expect(projectKey(nested)).toBe(resolve(root));
  });
  it("falls back to cwd when no .git ancestor exists", () => {
    const nested = join(root, "x");
    mkdirSync(nested);
    expect(projectKey(nested)).toBe(resolve(nested));
  });
});
