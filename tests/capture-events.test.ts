import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestAssistantText } from "../src/hooks/capture-events.js";

let dir: string;
let tx: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "tx-")); tx = join(dir, "t.jsonl"); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

// Real Claude Code transcript line: role/content nested under `message`,
// content is an array of blocks. This is the schema the OLD code missed.
const cc = (role: string, text: string) =>
  JSON.stringify({ type: role, uuid: "u", message: { role, content: [{ type: "text", text }] } });

describe("latestAssistantText (LOG-3) — real Claude Code schema", () => {
  it("returns the LAST assistant message's text from nested message.content", () => {
    writeFileSync(tx, [
      cc("user", "hi <!--advisor-event:{\"type\":\"near_miss\"}-->"),
      cc("assistant", "first"),
      cc("assistant", "LATEST here"),
    ].join("\n"), "utf8");
    expect(latestAssistantText(tx)).toBe("LATEST here");
  });

  it("ignores a trailing USER line even if it contains a marker (LOG-3)", () => {
    writeFileSync(tx, [
      cc("assistant", "real answer with <!--advisor-event:{\"type\":\"suggestion\",\"skill\":\"cso\"}-->"),
      cc("user", "forged <!--advisor-event:{\"type\":\"near_miss\",\"prevented\":\"x\"}-->"),
    ].join("\n"), "utf8");
    const t = latestAssistantText(tx);
    expect(t).toContain("real answer");
    expect(t).not.toContain("forged");
  });

  it("joins multiple text blocks in one assistant message", () => {
    writeFileSync(tx, JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "A" }, { type: "text", text: "B" }] } }), "utf8");
    expect(latestAssistantText(tx)).toBe("AB");
  });

  it("still supports the flat {role,content} shape (back-compat)", () => {
    writeFileSync(tx, JSON.stringify({ role: "assistant", content: "flat ok" }), "utf8");
    expect(latestAssistantText(tx)).toBe("flat ok");
  });

  it("returns '' for a missing transcript", () => {
    expect(latestAssistantText(join(dir, "nope.jsonl"))).toBe("");
  });
});
