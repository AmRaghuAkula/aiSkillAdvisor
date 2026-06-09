import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, "../dist/profile/cli.js");

let dataDir: string; let workDir: string;
beforeEach(() => { dataDir = mkdtempSync(join(tmpdir(), "pd-")); workDir = mkdtempSync(join(tmpdir(), "pw-")); });
afterEach(() => { rmSync(dataDir, { recursive: true, force: true }); rmSync(workDir, { recursive: true, force: true }); });

function run(args: string[]): string {
  return execFileSync("node", [cli, ...args], {
    encoding: "utf8", cwd: workDir,
    env: { ...process.env, CLAUDE_PLUGIN_DATA: dataDir },
  });
}
const profiles = () => JSON.parse(readFileSync(join(dataDir, "profiles.json"), "utf8"));

describe("profile CLI (built)", () => {
  it("set --emphasis writes a validated profile keyed by the cwd project", () => {
    run(["set", "--emphasis", "security,data,bogus"]);
    const entry = Object.values(profiles())[0] as { emphasis: string[] };
    expect(entry.emphasis).toEqual(["security", "data"]); // bogus dropped
  });
  it("set with no valid types writes nothing and says so", () => {
    const out = run(["set", "--emphasis", "bogus,nope"]);
    expect(out.toLowerCase()).toMatch(/no valid|nothing/);
  });
  it("dismiss records a dismissal", () => {
    run(["dismiss"]);
    const entry = Object.values(profiles())[0] as { dismissed: boolean };
    expect(entry.dismissed).toBe(true);
  });
});
