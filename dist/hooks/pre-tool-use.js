// Shared with the brain's SEC-2 allowlist (SP2). Keep in sync; a drift test
// (Task 6) guards against divergence.
export const READ_ONLY_SKILLS = new Set([
    "brainstorming", "spec", "writing-plans", "code-review", "review",
    "design-review", "verification-before-completion", "investigate",
    "browse", "qa-only", "health",
]);
/** The Skill tool's skill-name field is undocumented — try the likely keys. */
export function skillNameFrom(toolInput) {
    const ti = toolInput ?? {};
    for (const k of ["skillName", "name", "skill", "skill_name"]) {
        const v = ti[k];
        if (typeof v === "string" && v.trim())
            return v.trim();
    }
    return "unknown";
}
export function invocationEvent(skill, sessionId, now = () => new Date().toISOString()) {
    const bare = skill.includes(":") ? skill.split(":").pop() : skill;
    return { type: "skill_invoked", ts: now(), sessionId, skill, stateChanging: !READ_ONLY_SKILLS.has(bare) };
}
