import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { validateEmphasis } from "./types.js";
/** Local-first profiles file (same base as the value log). */
export function profilesPath() {
    const base = process.env.CLAUDE_PLUGIN_DATA ?? join(homedir(), ".claude", "ai-skill-advisor");
    return join(base, "profiles.json");
}
function readAll(path) {
    if (!existsSync(path))
        return {};
    try {
        const o = JSON.parse(readFileSync(path, "utf8"));
        return o && typeof o === "object" ? o : {};
    }
    catch {
        return {};
    }
}
/** Defensive read: missing/corrupt → undefined; never throws. */
export function readProfile(key, path = profilesPath()) {
    const all = readAll(path);
    const p = all[key];
    if (!p || typeof p !== "object" || typeof p.projectKey !== "string")
        return undefined;
    // PROFILE-1 (cso): re-validate emphasis at the READ/use boundary. The stored
    // file is never trusted (could be hand-edited/forged/corrupt); only whitelisted
    // tokens survive, so anything injected into model context downstream is provably
    // whitelist-only. This also caps emphasis size (dedupe + finite whitelist).
    return { ...p, emphasis: validateEmphasis(Array.isArray(p.emphasis) ? p.emphasis : []) };
}
/** Best-effort write (merges into the keyed map); never throws. */
export function writeProfile(p, path = profilesPath()) {
    try {
        mkdirSync(dirname(path), { recursive: true });
        const all = readAll(path);
        all[p.projectKey] = p;
        writeFileSync(path, JSON.stringify(all, null, 2), "utf8");
    }
    catch {
        /* profile persistence must never crash the session */
    }
}
/** Record an explicit dismissal (suppresses the nudge, no emphasis lean). */
export function dismiss(key, path = profilesPath()) {
    writeProfile({ projectKey: key, emphasis: [], sources: [], ts: new Date().toISOString(), dismissed: true }, path);
}
