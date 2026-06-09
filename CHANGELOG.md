# Changelog

All notable changes to aiSkillAdvisor are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow [SemVer](https://semver.org/).

## [0.2.0] — 2026-06-09

### Fixed
- **The value log now captures the advisor's suggestions and near-misses.** The `Stop` hook previously read the wrong transcript shape (top-level `role`/`content`) and recorded nothing but skill-runs; it now reads Claude Code's real transcript schema (`message.content` blocks). `/skill-value` reflects real activity, not just invocations.

### Added
- **Deterministic loop-prevention rails in code.** L2 (asks before the 3rd state-changing skill in a session) and L5 (asks on an immediate back-to-back repeat), surfaced via the PreToolUse hook. Fail-open — a glitch never blocks your work. L1/L3/L4 remain advisory.
- Multi-turn eval scaffold for the decline-then-no-repeat behavior.

## [0.1.0] — 2026-06-08

### Added
- **First installable release.** No-terminal install via a self-serving marketplace + prebuilt `dist/` (no build step on the user's machine).
- Always-on advisor: auto-discovers installed skills each session, suggests the right one at the right moment, and flags risky/destructive actions before they happen.
- Value & near-miss log + the `/skill-value` report. Local-first — no telemetry, nothing leaves your machine.
- Security posture: untrusted-inventory handling (SEC-1) and an auto-run allowlist (SEC-2).
- Launch README + `INSTALL.md`; explicit privacy guarantee.
