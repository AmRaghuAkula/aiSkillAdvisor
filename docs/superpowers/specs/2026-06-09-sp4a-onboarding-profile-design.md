# SP4a — Smart Onboarding + Per-Project Profile Design Spec

**Date:** 2026-06-09
**Status:** Design (brainstorming complete; pending user review → `plan-eng-review` → writing-plans)
**Sub-project of:** SP4 (onboarding + control panel). SP4 was decomposed into **SP4a (this — onboarding + profile)** and **SP4b (browser control panel)**. SP4a ships first because it ships value alone *and* defines the profile/settings data model SP4b will later visualize + edit.
**Builds on:** v0.2.0 (`main` @ `00f22ef`) — installed plugin, the advising brain, the value log.

---

## 1. Purpose

Make first-run feel smart instead of an interrogation, and give the advisor **per-project context** so suggestions are sharper. On demand, the advisor reads sources **the user explicitly consents to**, infers the project's **work-type emphasis**, confirms it in plain language, and stores a small **per-project profile**. From then on, suggestions lean toward what matters in *this* project — without ever suppressing a clearly-fitting skill.

This is the "inherit Claude context — infer + confirm, not interview" idea ([[project-onboarding-inherit-claude-context]]), scoped to a minimal, privacy-first v1.

## 2. Decisions locked (brainstorming 2026-06-09)

1. **Profile = work-type emphasis only.** Infer a small ranked set of work-types (from the existing taxonomy: data/financial, security/auth, AI/LLM, infra/data, performance/debug, visual/brand, quality-judgment, growth/ops, spec-ambiguous). Muting skills + aggressiveness are **SP4b** (control panel), not here.
2. **Trigger = gentle nudge + on-demand.** SessionStart drops ONE one-line tip ("run `/advisor-tune` to tune me for this project") only when there's no profile yet and the user hasn't dismissed it. The real infer+confirm happens only when the user runs the command. Lightest proactive footprint; honors "advises, doesn't nag."
3. **User controls what the plugin sees.** The command states exactly what it will read and lets the user adjust **before reading anything**. Safe default = *this project's signals only*. (Founder principle: the user, not the plugin, decides scope.)
4. **AI-driven inference.** The command feeds the *consented* source contents to the in-session AI, which infers the emphasis. No API cost, reads meaning not keywords, consistent with the "brain rides the session" architecture. (Rejected: code-side keyword heuristics — dumb + redundant.)
5. **Soft lean, never suppress.** Emphasis boosts relevance/ordering of matching skills; it never hides a clearly-fitting skill outside the emphasis (preserves the open-world "never miss a fit" rule).
6. **Local-first (privacy guarantee intact).** Profile lives in `${CLAUDE_PLUGIN_DATA}/profiles.json`; stores work-type tags + source *names* only (never file contents); no telemetry, no network.

## 3. Default consented sources (adjustable by the user)

Default scope the command proposes (user may add/remove before it reads):
- the project's `CLAUDE.md` (if present)
- the project's `README` (top-level)
- top-level folder/file **names** (structure, not contents)
- the installed-skills inventory (already in context)

**Not** in the default: the user's global `~/.claude` memory / global CLAUDE.md (broader, less predictable, cross-project bleed) — available only if the user explicitly adds it.

## 4. Architecture / flow

```
SessionStart hook (run-session-start)
  read profile for the current project key
   ├─ profile present     → inject a soft "emphasis" hint into the advisor context
   ├─ none & not dismissed → inject ONE-line nudge: "tip: run /advisor-tune …"
   └─ none & dismissed     → inject nothing (silent)

/advisor-tune  (on-demand command; disable-model-invocation)
  1. CONSENT: "I'll read: <default sources>. OK, or add/remove?"  → user confirms/adjusts
  2. INFER:  AI reads ONLY the consented sources → ranks the project's work-types
  3. CONFIRM:"Looks like <emphasis> for this project. Tune for that? [yes / tweak / cancel]"
  4. WRITE:  on yes → `node <root>/dist/profile/cli.js set --emphasis <csv>` (validates + stores)
             on cancel/never → `… cli.js dismiss` (suppress the nudge; no profile)

ADVISOR BRAIN (skills/advisor/SKILL.md)
  uses the injected emphasis as a SOFT lean when ranking which skill to surface;
  never suppresses a clearly-fitting skill outside the emphasis.
```

## 5. Components

| Component | Type | Responsibility |
|---|---|---|
| `src/profile/types.ts` | code | `WorkType` union (mirrors the taxonomy) + `Profile { projectKey, emphasis: WorkType[], sources: string[], ts, dismissed? }` |
| `src/profile/project-key.ts` | code | derive a stable project key: git repo root (from cwd) else cwd; pure + total |
| `src/profile/store.ts` | code | `readProfile(key)` / `writeProfile(p)` / `dismiss(key)` over `${CLAUDE_PLUGIN_DATA}/profiles.json`; fail-safe (missing/corrupt → no profile; never throws) |
| `src/profile/cli.ts` | code | `set --emphasis <csv>` + `dismiss`; computes the key from cwd; validates emphasis against the work-type whitelist (drops unknown); writes via `store` |
| `src/hooks/session-start.ts` (+ runner) | code | inject the emphasis hint, or the one-line nudge, or nothing |
| `commands/advisor-tune.md` | command | drives consent → infer (consented sources only) → confirm → `cli set`/`dismiss` |
| `skills/advisor/SKILL.md` | brain update | honor the injected emphasis as a soft lean (never suppress) |
| `tests/**` | tests | unit + assisted inference eval |

## 6. Data shape

```jsonc
// ${CLAUDE_PLUGIN_DATA}/profiles.json — keyed by project
{
  "<projectKey>": {
    "emphasis": ["security", "data"],         // validated work-types, ranked
    "sources": ["CLAUDE.md", "README", "tree", "inventory"],  // names only
    "ts": "ISO-8601",
    "dismissed": false                          // true if user declined onboarding
  }
}
```
Validation (cli/store): `emphasis` entries must be in the work-type whitelist; unknown dropped; empty emphasis with `dismissed:true` is valid (nudge suppressed, no lean).

## 7. How emphasis reaches the brain

The SessionStart injection gains one short line when a profile exists, e.g.:
`aiSkillAdvisor profile: this project emphasizes security, data. Lean toward matching skills first; still surface any clearly-fitting skill (never suppress).`
The advisor `SKILL.md` gets a short "Profile emphasis (soft lean)" section instructing exactly that. No change to SEC-1/SEC-2 or the routing cases.

## 8. Privacy & security

- **Local-first:** profile + reads stay on the machine; no telemetry, no network (preserves the v0.2.0 guarantee).
- **Consent-gated reads:** the command reads only sources the user approved this run. Defaults are project-scoped; global memory is opt-in only.
- **Stored data is minimal:** work-type tags + source names + timestamp. Never file contents, never secrets.
- **Untrusted-input posture unchanged:** inferred emphasis only *re-orders* suggestions; it cannot auto-run anything (SEC-2 still gates state-changing skills). A malicious CLAUDE.md can at worst skew emphasis (soft lean) — it cannot make the advisor run or recommend something unsafe.

## 9. Error handling

- No profile / corrupt profile / unreadable `profiles.json` → advisor behaves exactly as today (no lean, no crash). All store reads are fail-safe.
- The one-line nudge shows at most until the user acts (tune or dismiss), then never again for that project.
- `cli set` with an unknown/empty work-type → drops unknowns; if nothing valid remains, writes nothing and reports back (the command tells the user).

## 10. Testing

- **Unit (CI):** `store` round-trip + corrupt-file tolerance + missing-file → undefined; `project-key` derivation (git root vs cwd); `session-start` output (emphasis hint vs nudge vs silent, by profile state); `cli set` whitelist validation + `dismiss`.
- **Assisted eval:** inference quality — feed a sample project's consented sources to the advisor and confirm it infers sensible emphasis + asks for confirmation (not an interview). Recorded in the PR like SP2/SP3a evals.
- **Merge gate:** CI green; assisted eval noted in the PR.

## 11. Scope (in / out)

**In SP4a:** per-project work-type-emphasis profile · consent-gated AI inference · `/advisor-tune` (infer/confirm/dismiss) · one-line SessionStart nudge · soft-lean injection + brain update · local store + CLI · unit tests + assisted eval.

**Out (deferred):**
- **All of SP4b:** the browser control panel, visual `/skill-value` dashboard, muting skills, aggressiveness slider, editing profiles via UI.
- Global-memory inference (opt-in source only, not default).
- Auto-update/decay of the profile (re-run `/advisor-tune` to refresh).
- Activation scope / Signal-0 "only fire in these repos" (can be a later profile field; not now).

## 12. Open questions for the plan

- **Command name:** `/advisor-tune` (proposed) vs `/advisor-onboard`. Lean `/advisor-tune` (covers first-run AND later re-tuning).
- **Profile CLI path resolution:** reuse the SP-LAUNCH pattern — SessionStart injects the resolved `dist/profile/cli.js` path (same as the value-report CLI), with `${CLAUDE_PLUGIN_ROOT}` fallback. Confirm in the plan.
- **Project key for non-git dirs:** cwd path is the fallback key — confirm that's acceptable (a moved/renamed folder starts fresh; acceptable for v1).

*Next: user review of this spec → `plan-eng-review` → `superpowers:writing-plans`.*
