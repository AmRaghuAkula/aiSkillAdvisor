import { describe, it, expect } from "vitest";
import { skillNameFrom, invocationEvent } from "../src/hooks/pre-tool-use.js";

describe("skillNameFrom", () => {
  it("reads the skill name from any of the likely fields", () => {
    expect(skillNameFrom({ skillName: "gstack:cso" })).toBe("gstack:cso");
    expect(skillNameFrom({ name: "cso" })).toBe("cso");
    expect(skillNameFrom({ skill: "review" })).toBe("review");
    expect(skillNameFrom(undefined)).toBe("unknown");
  });
});

describe("invocationEvent", () => {
  it("marks a non-allowlisted skill as state-changing", () => {
    const e = invocationEvent("ship", "s1", () => "t");
    expect(e).toMatchObject({ type: "skill_invoked", skill: "ship", stateChanging: true, sessionId: "s1" });
  });
  it("marks a read-only allowlisted skill as not state-changing (namespaced ok)", () => {
    expect(invocationEvent("gstack:browse", "s1", () => "t").stateChanging).toBe(false);
  });
});
