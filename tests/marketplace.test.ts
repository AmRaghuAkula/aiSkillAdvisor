import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Guards the install surface: the marketplace must list THIS plugin, point at the
// repo root, and never drift from plugin.json's name/version (so version bumps
// stay in lockstep).
describe("marketplace.json stays consistent with plugin.json", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const read = (p: string) => JSON.parse(readFileSync(resolve(here, p), "utf8"));

  it("lists the plugin with matching name + version and a self source", () => {
    const market = read("../.claude-plugin/marketplace.json");
    const plugin = read("../.claude-plugin/plugin.json");
    expect(typeof market.name).toBe("string");
    expect(market.owner?.name).toBeTruthy();
    const entry = (market.plugins ?? []).find((p: { name?: string }) => p.name === plugin.name);
    expect(entry, `marketplace.json must list plugin '${plugin.name}'`).toBeTruthy();
    expect(entry.source).toBe("./");
    expect(entry.version).toBe(plugin.version);
  });
});
