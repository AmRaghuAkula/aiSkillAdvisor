/** Canonical work-type tags a profile may emphasize (maps to the brain's taxonomy). */
export const WORK_TYPES = [
    "data", "security", "ai", "infra", "performance", "visual", "growth", "quality",
];
const SET = new Set(WORK_TYPES);
/** Pure: lowercase+trim, keep only whitelisted types, dedupe, preserve first-seen order. */
export function validateEmphasis(raw) {
    const out = [];
    for (const r of raw) {
        const t = (typeof r === "string" ? r : "").trim().toLowerCase();
        if (SET.has(t) && !out.includes(t))
            out.push(t);
    }
    return out;
}
