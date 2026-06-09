export function filterWindow(events, window, now = () => Date.now()) {
    if (events.length === 0)
        return [];
    if (window === "session") {
        const last = events[events.length - 1].sessionId;
        return events.filter((e) => e.sessionId === last);
    }
    const cutoff = window === "today"
        ? new Date(new Date(now()).toISOString().slice(0, 10) + "T00:00:00.000Z").getTime()
        : now() - 7 * 24 * 60 * 60 * 1000;
    return events.filter((e) => Date.parse(e.ts) >= cutoff);
}
/** Plain-language report. Renders as text (LOG-5: data is plain, never executed). */
export function summarize(events) {
    if (events.length === 0)
        return "No advisor activity recorded yet.";
    const count = (t) => events.filter((e) => e.type === t).length;
    const suggestions = count("suggestion");
    const accepted = count("suggestion_accepted");
    const declined = count("declined");
    const invoked = count("skill_invoked");
    const nearMisses = events.filter((e) => e.type === "near_miss");
    const lines = [];
    lines.push("aiSkillAdvisor — value report");
    lines.push(`  Suggestions made: ${suggestions} (accepted ${accepted}, declined ${declined})`);
    lines.push(`  Skills run: ${invoked}`);
    lines.push(`  ${nearMisses.length} near-miss${nearMisses.length === 1 ? "" : "es"} caught (prevented mistakes)`);
    for (const nm of nearMisses)
        lines.push(`     • ${nm.prevented ?? "(unspecified)"}${nm.skill ? ` [${nm.skill}]` : ""}`);
    return lines.join("\n");
}
