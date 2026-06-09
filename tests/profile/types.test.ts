import { describe, it, expect } from "vitest";
import { validateEmphasis, WORK_TYPES } from "../../src/profile/types.js";

describe("validateEmphasis", () => {
  it("keeps only whitelisted work-types, lowercased + trimmed, in order", () => {
    expect(validateEmphasis([" Security ", "DATA", "nonsense"])).toEqual(["security", "data"]);
  });
  it("dedupes and drops everything unknown", () => {
    expect(validateEmphasis(["security", "security", "wat"])).toEqual(["security"]);
  });
  it("returns [] for empty/garbage input", () => {
    expect(validateEmphasis([])).toEqual([]);
    expect(validateEmphasis(["", "  ", "xyz"])).toEqual([]);
  });
  it("WORK_TYPES is the canonical whitelist", () => {
    expect(WORK_TYPES).toContain("security");
    expect(WORK_TYPES).toContain("visual");
  });
});
