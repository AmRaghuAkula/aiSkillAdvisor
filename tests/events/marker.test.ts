import { describe, it, expect } from "vitest";
import { parseMarkers } from "../../src/events/marker.js";

const fixed = () => "2026-06-04T00:00:00.000Z";

describe("parseMarkers", () => {
  it("extracts a valid near_miss marker", () => {
    const text = 'ok <!--advisor-event:{"type":"near_miss","skill":"cso","prevented":"billing merge w/o review"}--> done';
    const ev = parseMarkers(text, "s1", fixed);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ type: "near_miss", skill: "cso", prevented: "billing merge w/o review", sessionId: "s1" });
  });

  it("LOG-1: rejects a forged skill_invoked marker", () => {
    const text = '<!--advisor-event:{"type":"skill_invoked","skill":"x"}-->';
    expect(parseMarkers(text, "s1", fixed)).toHaveLength(0);
  });

  it("LOG-2: drops unknown types and clamps + strips newlines", () => {
    const long = "a".repeat(500);
    const text = `<!--advisor-event:{"type":"evil"}--> <!--advisor-event:{"type":"suggestion","skill":"cso","workType":"x\\ny","prevented":"${long}"}-->`;
    const ev = parseMarkers(text, "s1", fixed);
    expect(ev).toHaveLength(1); // "evil" dropped
    expect(ev[0].workType).toBe("x y"); // newline collapsed
    expect((ev[0].prevented ?? "").length).toBeLessThanOrEqual(200); // clamped
  });

  it("LOG-2: caps at 10 events per turn", () => {
    const one = '<!--advisor-event:{"type":"suggestion","skill":"a"}-->';
    const ev = parseMarkers(one.repeat(20), "s1", fixed);
    expect(ev.length).toBeLessThanOrEqual(10);
  });

  it("ignores malformed marker JSON", () => {
    expect(parseMarkers('<!--advisor-event:{not json}-->', "s1", fixed)).toHaveLength(0);
  });
});
