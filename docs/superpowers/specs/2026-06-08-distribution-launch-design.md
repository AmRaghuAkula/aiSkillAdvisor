# SP-LAUNCH — Distribution & Launch Readiness Design Spec

**Date:** 2026-06-08
**Status:** Design (brainstorming complete; pending user review → `plan-eng-review` → writing-plans)
**Sub-project of:** the v1 design spec (`docs/superpowers/specs/2026-06-02-v1-design.md`) — implements **F2 (one-command install)** for aiSkillAdvisor *itself* (distinct from SP5, which installs *other* skills).
**Builds on:** SP0–SP3a (all merged; `main` @ `c293e67`).
**Trigger:** the SP3a manual test proved a non-technical user cannot install or use the plugin today (it needs CLI + clone + `npm build` + `claude --plugin-dir`). The founder now wants to use the advisor in a separate project (OnePersonAI). Making it cleanly installable is the precondition for both real-world use and painless live-testing.

---

## 1. Purpose

Make aiSkillAdvisor installable by a **non-technical user with no terminal**, and give it a real landing page. After this ships, the founder (or anyone) installs the advisor from inside Claude Code via the `/plugin` menu — once, at user scope — and it is active in **every** project (including OnePersonAI) with **no files written into any repo**.

This also closes a deferred verification: installing it properly and using it **is** the live test, so the AI marker-emission check (deferred from SP3a) gets confirmed in the same run.

## 2. Decisions locked (brainstorming 2026-06-08)

1. **Scope = B (installable + verified + launch README)**, sequenced as two phases so use is unblocked before docs are polished:
   - **Phase 1 — Install core** (this is what unblocks OnePersonAI): publish as a marketplace, ship prebuilt `dist/`, harden the `/skill-value` path, version + CI guard, verify end-to-end.
   - **Phase 2 — Launch README** (Paperclip-grade), shipped right after Phase 1 merges.
   Each phase is its own branch → PR → CI-green → merge (honors one-active-branch).
2. **Self-serving marketplace.** One file (`.claude-plugin/marketplace.json`) makes the repo serve *itself* as a plugin (`source: "./"`). Confirmed valid by claude-code-guide research (2026-06-08).
3. **Ship prebuilt code.** Claude Code *copies* a plugin into its cache — it never runs `npm install`/`npm run build`. So compiled `dist/` must be committed (it is currently gitignored). A CI guard prevents `dist/` from silently drifting from source.
4. **No-terminal install is the primary path** (`/plugin` UI). The `claude plugin …` CLI path comes free for technical users.
5. **Version `0.1.0`**, bumped per release (explicit, not commit-SHA — this is becoming a real release, not just dogfood).
6. **License is already decided:** `PolyForm-Noncommercial-1.0.0` (free, non-commercial) — already in `plugin.json`. The README states it; no change needed.

## 3. Architecture / what changes

This sub-project is **packaging + docs**, not new runtime behavior. Nothing in the advising/logging engine changes. The deliverables:

```
PHASE 1 — INSTALL CORE
  .claude-plugin/marketplace.json   NEW   repo serves itself as a plugin (source "./")
  .gitignore                        EDIT  stop ignoring dist/ (keep build/, out/ ignored)
  dist/** (committed)               NEW   prebuilt JS, the runtime the hooks execute
  .gitattributes                    NEW   force LF on committed dist/*.js (cross-platform-stable)
  plugin.json + package.json        EDIT  version 0.0.1 → 0.1.0
  commands/skill-value.md           EDIT  robust path resolution (close EF3 for the INSTALLED case)
  .github/workflows/ci.yml          EDIT  add a "dist is fresh" guard (rebuild → git diff must be clean)
  INSTALL.md (or README quickstart) NEW   the no-terminal /plugin steps (the founder's how-to)

PHASE 2 — LAUNCH README
  README.md                         REWRITE  Paperclip-grade landing page (replaces the stale vision README)
```

## 4. Components (Phase 1 detail)

| Component | Change | Responsibility / acceptance |
|---|---|---|
| `.claude-plugin/marketplace.json` | NEW | `{ name, owner{name}, plugins:[{ name:"ai-skill-advisor", source:"./", description, version:"0.1.0" }] }`. Marketplace name + plugin name verified to install as `ai-skill-advisor@<marketplace>`. |
| `.gitignore` | EDIT | Remove `dist/` from the "Build output" block (keep `build/`, `out/`). |
| `dist/**` | NEW (committed) | Freshly built (`npm run build`) output committed. The hooks run `node ${CLAUDE_PLUGIN_ROOT}/dist/hooks/*.js`; the report runs `dist/report/cli.js`. |
| `.gitattributes` | NEW | `dist/**/*.js text eol=lf` (+ sensible defaults) so the Windows-built commit matches the Ubuntu CI rebuild byte-for-byte. |
| `plugin.json`, `package.json` | EDIT | `version`: `0.0.1` → `0.1.0`. |
| `commands/skill-value.md` | EDIT | Ensure `/skill-value` reliably finds + runs the bundled CLI **when installed** (not just under `--plugin-dir`). See §5. |
| `.github/workflows/ci.yml` | EDIT | After `npm run build`, add `git diff --exit-code -- dist` (fails the PR if committed `dist/` is stale). |
| `INSTALL.md` | NEW | The non-technical, no-terminal `/plugin` walkthrough (also feeds README quickstart in Phase 2). |

## 5. The `/skill-value` path fix (EF3) — decision + verification

**Tension to resolve:** claude-code-guide research says `${CLAUDE_PLUGIN_ROOT}` does **not** expand inside a command body (only in hooks/MCP/LSP configs). But the SP3a live test (under `--plugin-dir`) showed it *did* expand. The command already carries a fallback instruction for the non-resolving case.

**Plan:** the implementation plan MUST first **verify the installed-marketplace behavior** (via claude-code-guide and/or the Phase-1 verify step), then pick the minimal robust fix:
- **If `${CLAUDE_PLUGIN_ROOT}` expands when installed** → keep it; just tighten the existing fallback wording. No new files.
- **If it does NOT expand when installed** → add a `bin/` wrapper (`bin/skill-value` + `bin/skill-value.cmd` for Windows) that self-resolves `../dist/report/cli.js` relative to its own location, and point the command at the bare `skill-value` command. (Requires confirming Claude Code adds plugin `bin/` to PATH — verify before relying on it.)

**Acceptance:** in an *installed* (not `--plugin-dir`) session, `/skill-value` prints a real report. This is a Phase-1 verify gate, not an assumption.

## 6. Versioning & release discipline

- `plugin.json` + `package.json` both carry the same explicit version; bump together each release.
- The CI "dist is fresh" guard makes a stale `dist/` a hard PR failure — so a code change without a matching rebuild can't merge.
- Documented in the README/CONTRIBUTING: "after changing `src/`, run `npm run build` and commit `dist/`."

## 7. Security (mini-review; `plan-eng-review` required, `cso` optional)

Low security surface — no new untrusted-input processing; the advising/logging engine is unchanged. Two points to note for review:

- **Supply-chain wrinkle (shipping prebuilt `dist/`):** committing compiled output means users run code they didn't build. Mitigations: the source is public and builds reproducibly; the CI freshness guard proves committed `dist/` equals a clean build of the committed `src/` (so the committed binary is auditable against source on every PR); no minification/bundling that would obscure the output.
- **No secrets / no network:** marketplace.json, dist, README, CI config contain no secrets and add no network calls. The value log remains local-first (`${CLAUDE_PLUGIN_DATA}`), unchanged.

`cso` is optional here (no new attacker-reachable surface); `plan-eng-review` is required per the review-before-build discipline.

## 8. Testing & verification

- **Unit/CI (automated):** existing 54 tests stay green; the new **dist-freshness CI guard** (`git diff --exit-code -- dist` after build) must pass — this both tests the guard and protects the prebuilt artifact.
- **Install verification (founder-run, the merge gate for Phase 1):** in a real Claude Code session in a **non-aiSkillAdvisor** project (e.g. OnePersonAI):
  1. `/plugin` → Marketplaces → Add → `AmRaghuAkula/aiSkillAdvisor` → Discover → install `ai-skill-advisor` at **user** scope → `/reload-plugins`.
  2. Confirm `/plugin list` shows it enabled; `/hooks` shows the 4 hooks; `/advisor` + `/skill-value` are present.
  3. Send a prompt that should trigger a suggestion; confirm the advisor surfaces one.
  4. Run `/skill-value` → a real report prints (closes EF3 for the installed path).
  5. Confirm the suggestion was logged (`Suggestions made: ≥1`) → **closes the deferred AI marker-emission check.**
- **No contamination check:** confirm nothing was written into the OnePersonAI repo (install is user-scoped; log lives in `${CLAUDE_PLUGIN_DATA}` under `~/.claude/…`).

## 9. Scope (in / out)

**In (Phase 1):** marketplace manifest · committed prebuilt `dist/` · `.gitattributes` · version bump · `/skill-value` path hardening · CI dist-freshness guard · `INSTALL.md` · end-to-end install verification.
**In (Phase 2):** Paperclip-grade `README.md`.

**Out (deferred):**
- Installing *other* skills for the user (SP5).
- Rich UI / control-panel screenshots in the README (SP4) — terminal screenshots only for now.
- Auto-update / one-click "install button" beyond the `/plugin` flow.
- L2/L5 code-hardening + multi-turn evals (SP3b).
- Anything paid/hosted.

## 10. Open questions for the implementation plan

- **EF3 installed behavior** (§5): does `${CLAUDE_PLUGIN_ROOT}` expand in a command body when installed via marketplace? Verify before choosing keep-vs-`bin/`-wrapper. Confirm whether plugin `bin/` is added to PATH if the wrapper route is needed.
- **CI dist determinism:** confirm `tsc` output is byte-identical between the Windows-built commit and the Ubuntu CI rebuild once `.gitattributes` forces LF. If any non-determinism remains (e.g. timestamps), adjust the guard (e.g. normalize, or build-and-compare a hash) rather than weaken it.
- **Marketplace + plugin naming:** confirm the exact install id users type (`ai-skill-advisor@<marketplace-name>`) and set the marketplace `name` so it reads cleanly.
- **`INSTALL.md` vs README quickstart:** decide whether Phase 1 ships a standalone `INSTALL.md` that Phase 2 folds into the README, or writes the quickstart straight into README in Phase 1. (Lean: short `INSTALL.md` in Phase 1, absorbed by README in Phase 2.)

*Next: user review of this spec → `plan-eng-review` → `superpowers:writing-plans`.*
