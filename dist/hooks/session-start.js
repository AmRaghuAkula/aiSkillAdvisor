export const ADVISOR_MARKER = "aiSkillAdvisor active";
/**
 * Build the SessionStart hook output. `inventoryBlock` is the pre-formatted,
 * sanitized, untrusted-wrapped inventory string (see inventory/format.ts).
 * `reportCliPath` is the absolute path to the value-report CLI, resolved by
 * the runner; when present it is injected into context so /skill-value works.
 */
export function buildSessionStartOutput(input, inventoryBlock, reportCliPath) {
    const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : "(unknown)";
    const intro = `${ADVISOR_MARKER}. You are advised by aiSkillAdvisor for this session ` +
        `(working dir: ${cwd}). Consult the skill inventory below to suggest the right ` +
        `skill at the right moment, per your advisor instructions.`;
    const report = typeof reportCliPath === "string" && reportCliPath
        ? ` To run the value report (the /skill-value command), execute with Node: ` +
            `node "${reportCliPath}".`
        : "";
    const block = typeof inventoryBlock === "string" && inventoryBlock ? `\n\n${inventoryBlock}` : "";
    return {
        hookSpecificOutput: {
            // Hardcoded: this builder serves the single SessionStart event we wire.
            hookEventName: "SessionStart",
            additionalContext: `${intro}${report}${block}`,
        },
    };
}
