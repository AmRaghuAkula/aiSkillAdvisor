import { writeProfile, dismiss } from "./store.js";
import { projectKey } from "./project-key.js";
import { validateEmphasis } from "./types.js";
function flag(name) {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
}
const csv = (v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
const cmd = (process.argv[2] ?? "").toLowerCase();
const key = projectKey();
if (cmd === "dismiss") {
    dismiss(key);
    process.stdout.write("aiSkillAdvisor: onboarding dismissed for this project.\n");
}
else if (cmd === "set") {
    const emphasis = validateEmphasis(csv(flag("--emphasis")));
    if (emphasis.length === 0) {
        process.stdout.write("aiSkillAdvisor: no valid work-types given; nothing written.\n");
    }
    else {
        const sources = csv(flag("--sources"));
        writeProfile({ projectKey: key, emphasis, sources, ts: new Date().toISOString() });
        process.stdout.write(`aiSkillAdvisor: profile set — emphasis: ${emphasis.join(", ")}.\n`);
    }
}
else {
    process.stdout.write("usage: profile/cli.js set --emphasis <csv> [--sources <csv>] | dismiss\n");
}
