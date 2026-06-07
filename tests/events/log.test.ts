import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, readEvents } from "../../src/events/log.js";
import type { AdvisorEvent } from "../../src/events/types.js";

let dir: string;
let path: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "evlog-")); path = join(dir, "events.jsonl"); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const ev: AdvisorEvent = { type: "near_miss", ts: "2026-06-04T00:00:00.000Z", sessionId: "s1", prevented: "billing merge w/o review" };

describe("event log", () => {
  it("appends and reads events round-trip", () => {
    appendEvent(ev, path);
    appendEvent({ type: "suggestion", ts: "2026-06-04T00:01:00.000Z", sessionId: "s1", skill: "cso" }, path);
    const got = readEvents(path);
    expect(got.map((e) => e.type)).toEqual(["near_miss", "suggestion"]);
  });

  it("skips malformed lines, never throws (LOG-4)", () => {
    writeFileSync(path, '{"type":"declined","ts":"t","sessionId":"s"}\n{bad json\n\n', "utf8");
    const got = readEvents(path);
    expect(got).toHaveLength(1);
    expect(got[0].type).toBe("declined");
  });

  it("returns [] for a missing log", () => {
    expect(readEvents(join(dir, "nope.jsonl"))).toEqual([]);
  });
});
