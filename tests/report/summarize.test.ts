import { describe, it, expect } from "vitest";
import { filterWindow, summarize } from "../../src/report/summarize.js";
import type { AdvisorEvent } from "../../src/events/types.js";

const now = () => Date.parse("2026-06-04T12:00:00.000Z");
const mk = (over: Partial<AdvisorEvent>): AdvisorEvent => ({ type: "suggestion", ts: "2026-06-04T10:00:00.000Z", sessionId: "s2", ...over });

describe("filterWindow", () => {
  it("session = events of the most-recent sessionId", () => {
    const evs = [mk({ sessionId: "s1" }), mk({ sessionId: "s2" })];
    expect(filterWindow(evs, "session", now).every((e) => e.sessionId === "s2")).toBe(true);
  });
  it("today excludes older-than-today events", () => {
    const evs = [mk({ ts: "2026-06-01T10:00:00.000Z" }), mk({ ts: "2026-06-04T10:00:00.000Z" })];
    expect(filterWindow(evs, "today", now)).toHaveLength(1);
  });
});

describe("summarize", () => {
  it("renders counts + lists near-misses", () => {
    const out = summarize([
      mk({ type: "suggestion", skill: "cso" }),
      mk({ type: "declined", skill: "cso" }),
      mk({ type: "near_miss", prevented: "billing merge w/o review" }),
      mk({ type: "skill_invoked", skill: "qa" }),
    ]);
    expect(out).toContain("1 near-miss");
    expect(out).toContain("billing merge w/o review");
    expect(out.toLowerCase()).toContain("suggestion");
  });

  it("counts accepted suggestions", () => {
    const out = summarize([
      mk({ type: "suggestion", skill: "cso" }),
      mk({ type: "suggestion_accepted", skill: "cso" }),
      mk({ type: "suggestion_accepted", skill: "qa" }),
    ]);
    expect(out).toContain("accepted 2");
  });

  it("handles an empty log gracefully", () => {
    expect(summarize([]).toLowerCase()).toContain("no advisor activity");
  });
});
