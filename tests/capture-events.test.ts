import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestAssistantText } from "../src/hooks/capture-events.js";

let dir: string;
let tx: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "tx-")); tx = join(dir, "t.jsonl"); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("latestAssistantText (LOG-3)", () => {
  it("returns the LAST assistant message, ignoring user/tool lines", () => {
    writeFileSync(tx, [
      JSON.stringify({ role: "user", content: "hi <!--advisor-event:{\"type\":\"near_miss\"}-->" }),
      JSON.stringify({ role: "assistant", content: "first" }),
      JSON.stringify({ type: "tool_use", tool_name: "Bash" }),
      JSON.stringify({ role: "assistant", content: "LATEST here" }),
    ].join("\n"), "utf8");
    expect(latestAssistantText(tx)).toBe("LATEST here");
  });

  it("handles assistant content as an array of text blocks", () => {
    writeFileSync(tx, JSON.stringify({ role: "assistant", content: [{ type: "text", text: "A" }, { type: "text", text: "B" }] }), "utf8");
    expect(latestAssistantText(tx)).toBe("AB");
  });

  it("returns '' for a missing transcript", () => {
    expect(latestAssistantText(join(dir, "nope.jsonl"))).toBe("");
  });
});
