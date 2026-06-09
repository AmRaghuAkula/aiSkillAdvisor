import { describe, it, expect } from "vitest";
import { evaluateBudget } from "../../src/events/budget.js";
import type { AdvisorEvent } from "../../src/events/types.js";

const inv = (skill: string, stateChanging: boolean): AdvisorEvent =>
  ({ type: "skill_invoked", ts: "2026-06-09T00:00:00.000Z", sessionId: "s", skill, stateChanging });

describe("evaluateBudget (L2 budget + L5 back-to-back cycle)", () => {
  it("allows when there is no prior history", () => {
    expect(evaluateBudget([], { skill: "cso", stateChanging: true }).action).toBe("allow");
  });

  it("L5: asks on an immediate back-to-back repeat (same skill twice in a row)", () => {
    const d = evaluateBudget([inv("design-review", false)], { skill: "design-review", stateChanging: false });
    expect(d.action).toBe("ask");
    expect(d.reason).toMatch(/twice in a row|loop|L5/i);
  });

  it("L5: matches the bare name across plugin-qualified ids (back-to-back)", () => {
    const d = evaluateBudget([inv("gstack:design-review", false)], { skill: "design-review", stateChanging: false });
    expect(d.action).toBe("ask");
  });

  it("L5: does NOT fire when the same skill ran earlier but NOT back-to-back", () => {
    const prior = [inv("design-review", false), inv("qa-only", false)];
    expect(evaluateBudget(prior, { skill: "design-review", stateChanging: false }).action).toBe("allow");
  });

  it("L2: allows the 1st and 2nd state-changing run, asks on the 3rd", () => {
    const prior = [inv("deploy", true), inv("migrate", true)];
    const d = evaluateBudget(prior, { skill: "publish", stateChanging: true });
    expect(d.action).toBe("ask");
    expect(d.reason).toMatch(/budget|state-changing|L2/i);
  });

  it("L2: read-only (non-state-changing) runs do not count and never trip", () => {
    const prior = [inv("brainstorming", false), inv("review", false), inv("health", false)];
    expect(evaluateBudget(prior, { skill: "qa-only", stateChanging: false }).action).toBe("allow");
  });

  it("L2: a read-only pending skill never trips the budget, even after 2 state-changing runs", () => {
    const prior = [inv("deploy", true), inv("migrate", true)];
    expect(evaluateBudget(prior, { skill: "qa-only", stateChanging: false }).action).toBe("allow");
  });

  it("ignores non-invocation events when counting", () => {
    const noise: AdvisorEvent[] = [
      { type: "suggestion", ts: "t", sessionId: "s", skill: "cso" },
      { type: "near_miss", ts: "t", sessionId: "s", prevented: "x" },
    ];
    expect(evaluateBudget([...noise, inv("deploy", true)], { skill: "ship", stateChanging: true }).action).toBe("allow");
  });
});
