export const ADVISOR_MARKER = "aiSkillAdvisor active";
/** The soft-lean hint / first-run nudge / silence, from the project's profile. */
export function profileNote(p) {
    if (!p) {
        return "No profile yet for this project — you may offer the /advisor-tune command once " +
            "(it tunes suggestions for this project). Don't re-offer if declined.";
    }
    if (p.emphasis && p.emphasis.length > 0) {
        return `Profile: this project emphasizes ${p.emphasis.join(", ")}. Lean toward matching ` +
            `skills first when choosing what to surface; never suppress a clearly-fitting skill ` +
            `outside the emphasis (the open-world rule still wins).`;
    }
    return undefined; // dismissed or empty → silent
}
export function buildSessionStartOutput(input, inventoryBlock, reportCliPath, profile) {
    const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : "(unknown)";
    const intro = `${ADVISOR_MARKER}. You are advised by aiSkillAdvisor for this session ` +
        `(working dir: ${cwd}). Consult the skill inventory below to suggest the right ` +
        `skill at the right moment, per your advisor instructions.`;
    const report = typeof reportCliPath === "string" && reportCliPath
        ? ` To run the value report (the /skill-value command), execute with Node: ` +
            `node "${reportCliPath}".`
        : "";
    const tune = profile && typeof profile.cliPath === "string" && profile.cliPath
        ? ` To set/clear this project's profile (the /advisor-tune command), run: ` +
            `node "${profile.cliPath}" set --emphasis <comma,types> | node "${profile.cliPath}" dismiss.`
        : "";
    const note = profile && typeof profile.note === "string" && profile.note ? ` ${profile.note}` : "";
    const block = typeof inventoryBlock === "string" && inventoryBlock ? `\n\n${inventoryBlock}` : "";
    return {
        hookSpecificOutput: {
            hookEventName: "SessionStart",
            additionalContext: `${intro}${report}${tune}${note}${block}`,
        },
    };
}
