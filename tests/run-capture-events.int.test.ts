import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const wrapper = resolve(here, "../dist/hooks/run-capture-events.js");

describe("run-capture-events wrapper (built)", () => {
  beforeAll(() => {
    if (!existsSync(wrapper)) throw new Error(`Build artifact missing: ${wrapper}. Run \`npm run build\`.`);
  });

  it("scrapes a near_miss marker from the latest assistant message into the log", () => {
    const d = mkdtempSync(join(tmpdir(), "cap-"));
    try {
      const tx = join(d, "t.jsonl");
      writeFileSync(tx, JSON.stringify({ role: "assistant", content: 'done <!--advisor-event:{"type":"near_miss","skill":"cso","prevented":"x"}-->' }), "utf8");
      execFileSync("node", [wrapper], { input: JSON.stringify({ transcript_path: tx, session_id: "s1" }), encoding: "utf8", env: { ...process.env, CLAUDE_PLUGIN_DATA: d } });
      expect(readFileSync(join(d, "events.jsonl"), "utf8")).toContain('"type":"near_miss"');
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("exits 0 on empty stdin", () => {
    expect(() => execFileSync("node", [wrapper], { input: "", encoding: "utf8" })).not.toThrow();
  });
});
