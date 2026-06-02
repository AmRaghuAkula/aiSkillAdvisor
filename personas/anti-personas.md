# Anti-Personas — Who aiSkillAdvisor is explicitly NOT for

**Why this file exists:** Per the brainstorming agent's recommendation (2026-06-01), persona templates are useful as starting points but dangerous as destinations. Anti-personas serve a complementary function: they document who **should NOT** adopt aiSkillAdvisor, and why. This prevents:

1. **Bad-fit users** from installing, getting frustrated, and writing negative reviews
2. **Scope creep** toward target users we don't actually serve well
3. **Marketing drift** toward "everyone benefits from this" (which means no one benefits enough)

The 5 personas in this folder cover the target users. The anti-personas below cover who the product is NOT for.

---

## Anti-Persona 1: The Senior Engineer

**Profile:**
- 10+ years of professional engineering experience
- Has deep mental models of when to invoke which tool
- Already maintains personal scripts, dotfiles, and workflow optimizations
- Reads Hacker News critically; suspicious of "AI advisor" framing

**Why aiSkillAdvisor is NOT for them:**
- The advisor's main value is **bridging the knowledge gap** between novice and expert. A senior engineer already has the expert knowledge internalized.
- The plain-language renderer would feel patronizing.
- The onboarding wizard's "what kind of work do you do" question would feel insulting.
- The kill-switch UX exists because non-tech users worry about AI interjection. Senior engineers don't have that anxiety; they just close the tool.

**What this means for the product:**
- Don't market to this persona. Don't tune onboarding for their objections.
- DO ensure the product is **tolerable** to a senior engineer who's evaluating it on behalf of a non-tech colleague (e.g., a CTO checking if their PM should use it). Tolerable = doesn't actively annoy them in a 5-minute demo.

**If a senior engineer DOES want to use it:** They can. The CLI is flexible. But the value-per-friction ratio is poor for them.

---

## Anti-Persona 2: The Enterprise Compliance Officer

**Profile:**
- Buys software for a 500+ person org
- Needs SOC 2, GDPR, HIPAA compliance documentation
- Requires SSO, audit logs, role-based access control
- Wants vendor SLAs

**Why aiSkillAdvisor is NOT for them (in v1):**
- v1 is **local-first, single-user**. No team accounts, no SSO, no audit log export, no SLA.
- Compliance certification is out of scope.
- The "non-technical builder" target is fundamentally a different market segment.

**What this means for the product:**
- v1 README should be clear: "This is a personal productivity tool. Enterprise features (SSO, audit logs, SLAs) are not in scope."
- An enterprise edition is **plausible in 3+ years** if the personal version finds traction. Not v1.

---

## Anti-Persona 3: The AI Skeptic

**Profile:**
- Believes AI coding tools are net-negative for code quality
- Refuses to use Copilot, Cursor, Claude Code
- Manually writes every line
- Vocal in code reviews about "AI slop"

**Why aiSkillAdvisor is NOT for them:**
- They aren't using AI coding tools, so an "AI skill advisor" has no skills to advise on.
- The product's foundational assumption — that the user is already invested in AI-assisted development — doesn't hold.

**What this means for the product:**
- Don't try to convert AI skeptics. The conversion cost is high; the conversion rate is low.
- Focus on users who already use AI tools but feel lost in the skill ecosystem.

---

## Anti-Persona 4: The Student Learning to Code

**Profile:**
- Currently learning programming for the first time
- Has no professional projects yet
- Stuck on tutorial-level work
- Wants to understand fundamentals, not optimize workflows

**Why aiSkillAdvisor is NOT for them (yet):**
- The advisor's value emerges when a user has **multiple projects and multiple skills to choose between**. A student with one tutorial project has neither.
- The complexity of the manifest, profile, and routing algorithm would distract from learning fundamentals.
- The product would feel like "yet another tool to learn" rather than help.

**What this means for the product:**
- v1 explicitly NOT targeted at first-time learners.
- A `student` persona could be added in **v2+** with a heavily simplified onboarding flow. Out of scope for v1.

---

## Anti-Persona 5: The CTO of a Funded Startup

**Profile:**
- Leads a 5-50 person engineering team
- Wants standardized tooling across the team
- Buys SaaS subscriptions for team productivity
- Cares about ROI, team metrics, dashboards

**Why aiSkillAdvisor is NOT for them (in v1):**
- v1 is single-user. No team rollout, no team dashboards, no admin controls.
- The buying motion (individual install via npm) doesn't match enterprise procurement.
- The value prop ("help non-technical builders") doesn't match their team (which is technical by definition).

**What this means for the product:**
- A team edition is **plausible at v2-v3** but requires major architectural additions (cloud sync, team profiles, admin UI).
- v1 should NOT compromise the personal-tool focus to chase team buyers.

---

## What the personas + anti-personas mean together

| Persona type | Number of users | LTV per user | Total addressable market |
|---|---|---|---|
| 5 target personas | Larger (millions of non-tech builders globally) | Lower (personal use, free OSS) | LARGE (community / mind-share / OSS adoption) |
| 5 anti-personas | Smaller (but higher LTV per user) | Higher (would pay for enterprise) | Tempting but NOT v1 focus |

**Strategic guardrail:** when v0.5 dogfooding produces feedback that pulls us toward an anti-persona (e.g., a request for "team features" or "compliance reporting"), reject the feature for v1. The "non-technical AI enthusiast" focus is the moat. Diluting it loses the moat.

**Re-evaluation cadence:** Anti-personas reviewed annually. If a particular anti-persona's market demand becomes overwhelming + the product team has capacity, the anti-persona can graduate to a target persona via an explicit fork or edition.

---

## Related

- [`solo-founder.yaml`](./solo-founder.yaml), [`designer-who-codes.yaml`](./designer-who-codes.yaml), [`pm-in-tech.yaml`](./pm-in-tech.yaml), [`indie-hacker.yaml`](./indie-hacker.yaml), [`hobbyist.yaml`](./hobbyist.yaml) — the 5 target personas
- [`../docs/PRODUCT_VISION.md`](../docs/PRODUCT_VISION.md) — target user definition
- [`../docs/BACKLOG.md`](../docs/BACKLOG.md) — what's in v1 (and what's deferred)
