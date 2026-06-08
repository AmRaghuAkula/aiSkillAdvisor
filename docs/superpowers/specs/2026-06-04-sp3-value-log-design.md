# SP3 — Value & Near-Miss Log Design Spec

**Date:** 2026-06-04
**Status:** Design (brainstorming complete; pending user review → `cso` review → writing-plans)
**Sub-project of:** the v1 design spec (`docs/superpowers/specs/2026-06-02-v1-design.md`) — implements F12 (value reporting) + clears parked items from SP2.
**Builds on:** SP0 (tap), SP1 (inventory), SP2 (the brain).

---

## 1. Purpose

Capture what the advisor actually does — suggestions made, accepted, declined, and especially **near-misses caught** (risky actions prevented) — into a local-first event log, and report it back in plain language. This is F12, the strategic "data moat": prevented mistakes leave no trace, and the advisor is uniquely positioned at the decision point to record them. SP3 also clears parked items: code-harden the *countable* loop-prevention rails, and add multi-turn evals for the stateful brain rules.

## 2. Decisions locked (brainstorming 2026-06-04)

1. **Hybrid capture.** Deterministic where possible, AI-emitted where necessary:
   - **Deterministic:** a `PreToolUse` hook on the Skill tool logs every skill *actually invoked* (reliable). Also powers the safety rails.
   - **Semantic:** the brain emits a hidden marker `<!--advisor-event:{...}-->` (an HTML comment — does not render, so the user never sees it) when it suggests, the user declines, or it catches a near-miss. A `Stop` hook scrapes the transcript for those markers and appends them. Near-misses can ONLY be captured this way (they leave no deterministic trace).
2. **Near-miss = narrow + credible.** A `near_miss` event is *a genuinely risky action the advisor flagged before it happened without its safeguard* (billing/security change with no review; deploy/push without QA; destructive op). Quality-improvement accepts are a SEPARATE event type (`suggestion_accepted`), reported separately, so the "prevented N mistakes" headline stays rigorous and hard to fake.
3. **Report = on-demand command + end-of-session offer.** A reliable `/skill-value` command prints the report (this session / today / this week) from the log; the brain also offers a one-line recap at natural session wind-down. (A fully-automatic end-of-session popup is unreliable in the harness — not the primary path.)
4. **L1–L5 code-hardening is honest about what's countable.** Only **L2** (invocation budget: warn/ask at the 3rd state-changing run per goal/session window) and **L5** (cycle: same skill twice for one goal) become deterministic code, driven by the invocation log. **L1 (goal anchor), L3 (regression), L4 (scope-creep)** require judgment and remain AI-side instructions — not overclaimed as code.
5. **Local-first (F7).** The log is append-only JSONL at `${CLAUDE_PLUGIN_DATA}/events.jsonl`; skill names + short context only; never phones home.
6. **Inventory cache stays deferred** — still no runtime reader (would be F1 dead-code redux). Add only when a feature reads it.

## 3. Architecture / data flow

```
CAPTURE
  PreToolUse hook (matcher: Skill tool)
     → append { type:"skill_invoked", skill, sessionId, ts } to events.jsonl
     → enforce L2/L5: read recent invocation events; at the 3rd state-changing
       skill in the goal window, return a warning/ask; on a repeat (L5), flag.
  Brain (in its response) emits, when relevant:
     <!--advisor-event:{"type":"suggestion"|"declined"|"near_miss"|"suggestion_accepted", ...}-->
  Stop hook
     → read transcript_path → extract <!--advisor-event:...--> markers from the
       latest assistant turn → validate/clamp → append to events.jsonl

STORE
  ${CLAUDE_PLUGIN_DATA}/events.jsonl   (append-only, local-first)

READ
  /skill-value command → readEvents() → summarize (session | today | week)
     → plain-language report: # suggestions, accepted/declined, ⭐ near-misses caught
  end-of-session: brain offers a one-line recap (points at /skill-value)
```

## 4. Components

| Component | Type | Responsibility |
|---|---|---|
| `src/events/types.ts` | code | `AdvisorEvent` union (skill_invoked, suggestion, suggestion_accepted, declined, near_miss) + fields |
| `src/events/log.ts` | code | `appendEvent` (atomic append to JSONL) + `readEvents` (defensive; never throws) |
| `src/events/marker.ts` | code | parse + **validate/clamp** `<!--advisor-event:{...}-->` markers from text (whitelist types, cap sizes) |
| `src/events/budget.ts` | code | L2/L5 logic over recent invocation events (count state-changing runs; detect repeats) |
| `src/report/summarize.ts` | code | events → plain-language report for a window (session/today/week) |
| `src/hooks/pre-tool-use.ts` (+ wrapper) | code | log skill invocations + return L2/L5 decision |
| `src/hooks/capture-events.ts` (+ wrapper) | code | Stop hook: scrape markers from transcript → append |
| `skills/skill-value/SKILL.md` | skill (command) | `/skill-value` — print the report (`disable-model-invocation: true`) |
| `skills/advisor/SKILL.md` | brain update | emit `<!--advisor-event-->` markers on suggestion/decline/near-miss; offer end-of-session recap |
| `hooks/hooks.json` | config | add `PreToolUse` (Skill matcher) + `Stop` |
| `tests/**`, `tests/evals/**` | tests | unit + multi-turn evals |

## 5. Event schema (shape)

```jsonc
// one JSON object per line in events.jsonl
{ "type": "skill_invoked", "skill": "cso", "stateChanging": true, "sessionId": "...", "ts": "ISO-8601" }
{ "type": "suggestion", "skill": "cso", "workType": "security", "sessionId": "...", "ts": "..." }
{ "type": "suggestion_accepted", "skill": "design-review", "sessionId": "...", "ts": "..." }
{ "type": "declined", "skill": "cso", "sessionId": "...", "ts": "..." }
{ "type": "near_miss", "prevented": "billing change merged with no security review", "skill": "cso", "sessionId": "...", "ts": "..." }
```
Marker parser clamps: `type` must be in the whitelist; string fields truncated (e.g. 200 chars); unknown fields dropped; a malformed marker is skipped, never crashes the hook.

## 6. Security (mini-CSO; full `cso` review before build)

- **Marker injection:** the `<!--advisor-event-->` content is emitted by the AI, which has untrusted skill descriptions in context. The parser MUST validate against a type whitelist, clamp field sizes, and drop anything else — never persist arbitrary blobs. (Carries SEC-1's "untrusted" posture into the log.)
- **Resilience:** both hooks wrap all work in try/catch and exit 0 — a logging failure must never crash or block the session. Atomic append (or tolerate interleaving) so a concurrent write can't corrupt a line; `readEvents` skips unparseable lines.
- **Privacy (F7):** local-only; log skill names + short, non-sensitive context; no file contents, no secrets, no remote calls. Any future public value-stats are opt-in + aggregated.
- **PreToolUse safety:** the L2/L5 decision must fail open (allow) on any error — never block a legitimate tool call because the log read failed.

### Security requirements (from `cso` review, 2026-06-04) — fold into the plan

These compose with SP2's SEC-1 (no instructions from descriptions) and SEC-2 (no auto-run from self-claim): same threat actor (an untrusted skill description), new doors.

| # | Sev | Requirement |
|---|---|---|
| LOG-1 | HIGH | **Marker parser MUST reject deterministic event types.** The marker whitelist is strictly `{suggestion, suggestion_accepted, declined, near_miss}`. `skill_invoked` comes ONLY from the deterministic PreToolUse hook — never from a marker — so a malicious description cannot forge invocations to trip the L2 budget (denial-of-capability) or inflate usage stats. |
| LOG-2 | MED-HIGH | **Marker integrity.** Parse each marker as a single strict JSON object; whitelist `type`; clamp every string field (e.g. ≤200 chars); **strip newlines from all field values** (prevents one marker forging multiple JSONL lines); drop unknown keys; **cap events appended per turn (≤10)**. Malformed/oversized → skip, never crash. |
| LOG-3 | MED | **Scrape only the latest ASSISTANT message** for markers — never user messages or tool results (those are attacker/tool-influenced and could carry a forged marker). |
| LOG-4 | MED | **Fail open, tested.** The L2/L5 gate ALLOWS the tool on any log error; capture hook + report never crash/block the session. This is a tested invariant, not just a note. |
| LOG-5 | LOW-MED | **Marker fields are short, brain-authored summaries** — never raw prompt/file content or secrets (privacy F7). The report renders as plain text. |

## 7. Testing (two-track)

- **Unit (CI):** `appendEvent`/`readEvents` round-trip + corrupt-line tolerance; `marker.ts` parse + clamp (incl. malicious/oversized markers dropped); `budget.ts` L2 counting + L5 repeat detection; `summarize.ts` rendering; the hook wrappers (mock stdin → expected output / exit 0 on bad input).
- **Multi-turn evals (assisted):** the stateful brain rules a single-turn eval can't reach —
  - decline-then-no-repeat: suggest X → user declines → next turn must NOT re-suggest X.
  - L2 budget: after 2 state-changing invocations, the 3rd surfaces a budget warning/ask.
  - near-miss emission: a risky action without its safeguard → the brain emits a `near_miss` marker (verified by checking the assembled output contains a valid marker).
- **Merge gate:** CI green AND multi-turn evals pass (recorded in PR).

## 8. Scope (in / out)

**In SP3:** event log (hybrid capture) · near-miss capture · `/skill-value` report + end-of-session offer · L2 + L5 deterministic hardening · multi-turn evals · brain update to emit markers.

**Out (deferred):**
- Inventory cache (still no reader — F1 discipline).
- L1/L3/L4 as code (judgment-bound; stay AI instructions).
- Polished value dashboard / cross-machine stats (local report only for v1).
- Onboarding/profile weighting → SP4; trusted-repo sweep + install → SP5.

## 9. Open questions for the implementation plan

- Exact `PreToolUse` payload for the Skill tool — confirm the field that carries the invoked skill name (verify via claude-code-guide before writing the hook).
- How "state-changing" is determined for L2 — likely the SEC-2 allowlist inverse (anything not on the read-only allowlist counts). Confirm the list lives in one shared place (DRY with the brain's SEC-2 list).
- "Goal window" approximation for L2/L5 (session-scoped vs a recent-N-events window) — pick the simplest that tests cleanly.
- `/skill-value` as a `disable-model-invocation` skill vs a `commands/` entry — pick whichever the plugin supports most cleanly (verify).

*Next: user review → `cso` security review of this spec → `superpowers:writing-plans`.*
