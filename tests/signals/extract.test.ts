import { describe, it, expect } from "vitest";
import { extractSignals } from "../../src/signals/extract.js";

describe("extractSignals", () => {
  it("detects security/billing work-type hints", () => {
    const s = extractSignals("I want to change the Stripe billing webhook");
    expect(s).toContain("billing");
    expect(s).toContain("security");
  });

  it("detects design work-type hints", () => {
    expect(extractSignals("make the landing page hero feel more premium")).toContain("design");
  });

  it("returns [] when no known signal is present", () => {
    expect(extractSignals("what time is it")).toEqual([]);
  });
});
