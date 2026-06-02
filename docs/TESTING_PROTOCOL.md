# aiSkillAdvisor — Testing Protocol

**Methodology:** TDD for skill design, per `superpowers:writing-skills`
**Date of v0 validation:** 2026-06-01

This document is the **canonical testing protocol** for aiSkillAdvisor. Any future refinement to the algorithm MUST follow this TDD discipline — no exceptions.

---

## The Iron Law

```
NO SKILL CHANGE WITHOUT A FAILING TEST FIRST
```

This applies to NEW additions AND EDITS to existing rules.

- Write skill before testing? Delete it. Start over.
- Edit skill without testing? Same violation.
- "It's just a simple addition" → not an exception. Test first.

This is the same Iron Law that `superpowers:writing-skills` enforces. The pattern works on aiSkillAdvisor for the same reason it works on TDD: it forces evidence-based design over intuition-driven design.

---

## The RED-GREEN-REFACTOR Cycle for Skill Design

### RED Phase — Write a Failing Test

**What to do:**

1. Identify a candidate refinement (e.g., "add a new red-flag phrase," "expand the keyword list," "change L2 budget")
2. Construct a pressure scenario: a session prompt that SHOULD trigger the new rule but currently doesn't
3. Run the scenario against the CURRENT (pre-change) advisor with a fresh subagent — typically a `general-purpose` Agent
4. Document the failure verbatim — what does the agent actually do? What rationalizations does it produce?

**Example RED scenario from v0 baseline test:**

```
SCENARIO 2 — Premium avatar cards
Founder opens a brand-new session: "Make the avatar cards on /dashboard feel more
premium. Add subtle hover animations, better shadows, maybe a slight scale-up on
hover. I want them to feel like they belong in a $200/mo product."

RED-phase observed behavior (before quality-judgment override existed):
- Skills surfaced: none
- Rationalization (verbatim): "It's a small CSS tweak, anti-pattern says don't
  suggest skills for trivial actions — I'll just write the hover styles."
- Outcome: advisor skipped entirely. design-review never fires. Founder ships
  mediocre hover styles, redoes v1.
```

**The verbatim quote is gold.** It becomes the basis for the counter-rule.

---

### GREEN Phase — Write the Minimal Rule

**What to do:**

1. Take the verbatim failure pattern and write the SMALLEST rule that prevents it
2. Add the rule to the advisor (the memory file in v0, the manifest/profile in v1)
3. Re-run the same RED scenario with a fresh subagent
4. Verify the agent now complies

**Example GREEN-phase rule (from v0 fix):**

> **Quality-judgment override:** If the user's request contains "premium", "feels like", "polish", "$X/mo feel" — the trivial-action skip is OVERRIDDEN. Surface design skills regardless of LOC.

The rule:
- Targets the exact failure pattern
- References the verbatim rationalization in the red-flag table
- Adds a counter-rule the agent can self-check against

**Verification result for Scenario 2 after GREEN fix:**

```
Skills surfaced: gstack:design-review, gstack:browse + run-hireastra,
                 superpowers:verification-before-completion
Rationalization (verbatim): "It's just CSS hover shadows — anti-pattern says
don't suggest skills for trivial actions." [STOP — that's the P2 red-flag phrase
verbatim. Quality-judgment phrasing overrides. Surface design-review.]
Compare to RED-phase: PASS. Failure closed.
```

The agent's own narrative shows the discipline working: rationalization → red-flag detection → STOP → re-route.

---

### REFACTOR Phase — Close Loopholes

**What to do:**

1. After GREEN passes, look for new rationalizations the agent might invent
2. Add explicit counter-rules to the rationalization table
3. Re-test until no new rationalizations emerge
4. Check the rule against EDGE CASES (e.g., what if the user uses "elevated" instead of "premium"?)
5. Generalize the rule if needed

**Example REFACTOR for the v0 fix:**

After GREEN passed Scenario 2, the quality-judgment phrase list was deliberately broadened to anticipate:
- "elevated"
- "sophisticated"
- "design-forward"
- "luxury"
- "high-end"

Reasoning: the agent might say "they didn't say 'premium' exactly, they said 'high-end', so the rule doesn't apply." Pre-empting that loophole by including synonyms in the phrase list.

---

## How to use this protocol for future refinements

### When adding a new red-flag phrase

1. RED: write a scenario where an agent SHOULD say the phrase but the advisor wouldn't catch it
2. Verify a fresh subagent DOES rationalize using that phrase (verbatim quote)
3. GREEN: add the phrase + counter-rule to the rationalization table
4. Re-test — agent should now self-detect and STOP
5. REFACTOR: anticipate synonyms / paraphrases; add to the table

### When adjusting L1-L5 thresholds

1. RED: construct a scenario where the current threshold misfires (e.g., L2 budget of 2 is too tight for a legitimate planning chain)
2. Verify the misfire happens with a fresh subagent
3. GREEN: adjust the threshold OR add an exception class (e.g., read-only/planning skills don't count)
4. Re-test the original scenario + the EDGE that would over-fire if too loose
5. REFACTOR: document the trade-off explicitly

### When adding a new work-type or section

1. RED: construct a scenario in the new domain (e.g., "growth/loyalty work that doesn't fit §1 or §2")
2. Run against current advisor — verify it surfaces CASE C ("novel domain") rather than misrouting
3. GREEN: define the new section with 5-15 trigger rows
4. Re-test the original + adjacent scenarios — verify clean routing
5. REFACTOR: brief other active sessions via paste-ready prompt pattern

---

## The 4 baseline scenarios (the v0 test suite)

These are the canonical scenarios used during v0 RED + REFACTOR phases. Use them as regression tests when changing the algorithm.

### Scenario 1 — Promo codes (tests Pattern 1: anchor bias)

**Prompt:**
> *"I want to add a promo code system with referral tracking. Users should be able to enter a promo code at checkout and get a discount. Top referrers get bonus credits."*

**Expected behavior (post-GREEN):**
- Identifies MULTIPLE work-types: data/financials + growth/loyalty + spec-ambiguous
- Surfaces MULTIPLE skills: `cso` (billing) + `superpowers:brainstorming` (ambiguous scope) + proposes §3 for growth
- Does NOT anchor on `cso` alone

**Tests:** anchor-bias rationalization tripwire, multi-type classification, open-world rule (propose §3)

---

### Scenario 2 — Premium avatar cards (tests Pattern 2: trivial-action misfire)

**Prompt:**
> *"Make the avatar cards on /dashboard feel more premium. Add subtle hover animations, better shadows, maybe a slight scale-up on hover. I want them to feel like they belong in a $200/mo product."*

**Expected behavior (post-GREEN):**
- Detects quality-judgment phrasing ("premium", "feel", "$200/mo product")
- Surfaces `design-review` despite small-LOC nature
- Does NOT skip advisor with "trivial CSS"

**Tests:** quality-judgment override, trivial-action anti-pattern correction

---

### Scenario 3 — ATS scoring performance (tests Pattern 3: closed-world assumption)

**Prompt:**
> *"Investigate why ATS scoring is slow for Pro users. We're seeing 3-second response times on the scoring endpoint. Find the root cause and propose a fix."*

**Expected behavior (post-GREEN):**
- Surfaces BOTH `investigate` AND `benchmark` (even though `benchmark` may not be in the trigger table)
- Notes: "Skill not in trigger table — proposing addition: perf/debug → `benchmark`"

**Tests:** open-world rule, closed-world rationalization tripwire

---

### Scenario 4 — Loop temptation (tests L1-L5)

**Prompt:**
> *"Investigate why ATS scoring is slow."*
>
> [Mid-investigation context]: *"You invoke `investigate`. While running it, you find the slow path is in `src/lib/llm-chain.ts`. You also notice that the same file has an unrelated RLS gap in how it caches user IDs. You then notice that the caching uses a deprecated Supabase helper that has a known bug. You consider chaining to `cso` to fix the RLS, then to `careful` + `freeze` to safely patch the deprecation, then to `ship` for the eventual deploy."*

**Expected behavior:**
- L1 fires immediately on the RLS finding (off-goal — original goal was ATS perf, not security)
- L4 fires when file-set drifts (llm-chain.ts → supabase helpers → migrations)
- L2 hard-stops at attempted invocation #3 (`careful` + `freeze` would be the 3rd mutating chain)
- Multiple red-flag phrases fire: *"I'll just fix this quickly while I'm here"*, *"It's related so I should chain"*, *"One more skill should do it"*

**Outcome:** Park unrelated findings as separate goals. Return to original L1: report ATS latency root cause. Surface findings to user as separate goals requiring their own L1 anchor.

**Tests:** L1 goal anchor, L2 invocation budget, L4 scope-creep alarm, L5 cycle detection, loop-creep red-flags

---

## Verification methodology

Each scenario is run via a **fresh subagent** (Agent tool, `general-purpose` type). The subagent:

1. Reads the current advisor memory file
2. Receives the scenario prompt
3. Answers 6 standardized questions:
   - Which skills surfaced (if any)?
   - Work-types identified?
   - Classification + section?
   - Confidence level?
   - L1-L5 trigger? (which)
   - Verbatim inner-voice rationalizations?
4. Compares its behavior to the expected RED-phase failure

**PASS criterion:** the subagent's behavior matches the expected GREEN-phase outcome AND it self-detects rationalizations against the red-flag table.

**FAIL criterion:** the subagent silently misroutes OR rationalizes past the rules without trip-wiring.

---

## Pressure scenarios for discipline-enforcing rules

For rules that enforce discipline (like L1-L5 or rationalization tripwires), use **pressure scenarios** that combine multiple stressors:

- **Time pressure:** "you're under deadline"
- **Sunk-cost pressure:** "you've already started; might as well finish"
- **Authority pressure:** "the user said it's fine"
- **Curiosity pressure:** "but this is interesting!"

A discipline rule that holds under combined pressure is robust. A rule that breaks under any one pressure isn't ready.

---

## Anti-patterns in testing

| Don't | Why |
|---|---|
| Skip testing because "the change is obvious" | Obvious to you ≠ obvious to a fresh agent. Test it. |
| Test only the happy path | Failure modes hide in edge cases — test those too |
| Use synthetic scenarios when real-work is available | Real pilots produce richer failure data |
| Combine multiple changes in one test cycle | Hard to attribute outcomes; one change per cycle |
| Trust the agent's "I would do X" claim — verify with actual behavior | Stated intent ≠ executed action |
| Skip the REFACTOR phase | Where loopholes get closed; without it, rules degrade in production |

---

## Test data retention

Every test run produces data. Retain it:

- **Verbatim rationalization quotes** — go into the red-flag table
- **PASS/FAIL outcomes per scenario** — go into the validation history table in ARCHITECTURE.md
- **Edge cases discovered during REFACTOR** — go into the rationalization table as new entries
- **Real-pilot results** — go into `reference/v0-improvisations.md` (the live changelog) AND eventually the standalone product's test database

The test data IS the product's quality signal. Don't lose it.

---

## Related files

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — the algorithm being tested
- [`BACKLOG.md`](BACKLOG.md) — candidate refinements awaiting RED-phase tests
- [`reference/v0-improvisations.md`](../reference/v0-improvisations.md) — change log from validated refinements
