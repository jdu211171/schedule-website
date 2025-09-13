🚨 **MANDATORY AI CODING ASSISTANT RULES - NO EXCEPTIONS** 🚨

⚠️ **CRITICAL**: These rules are FREQUENTLY IGNORED - PAY ATTENTION! ⚠️

- **🔧 TOOLS - STRICT REQUIREMENTS**
  - 🛑 **MANDATORY**: Use Bun for package management (NOT npm, NOT yarn)
  - 🛑 **MANDATORY**: Fix TypeScript errors after ALL changes
  - 🛑 **MANDATORY**: Use the local PostgreSQL database via psql (with credentials) instead of Prisma for local DB operations, e.g.: `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "<your_command_here>"`

- **📝 CODE CHANGES - ZERO TOLERANCE POLICY**
  - ✅ **ONLY modify relevant code parts** - Do NOT touch unrelated code
  - ✅ **PRESERVE ALL**: formatting, names, and documentation unless EXPLICITLY requested
  - ✅ **FOLLOW EXISTING PATTERNS**: Refer to existing similar code structure when generating new code (components, API routes, utilities, types, assets)

- **📋 PROJECT MANAGEMENT - ABSOLUTELY REQUIRED**
  - 🔴 **MANDATORY**: Use Spec Kit specs for tasks, progress, and issues. Update `specs/<id>-<slug>/plan.md` and `tasks.md` regularly — NO EXCEPTIONS
  - 🔴 **SESSION START CHECKLIST**: review the active spec in `specs/`, run `git status`, check recent commits — DO NOT SKIP
  - Active spec by branch (convention: branch suffix `NNN-slug` → folder `specs/NNN-slug/`): use `scripts/active-spec.sh`
    - Export: `export ACTIVE_SPEC=$(scripts/active-spec.sh)`
    - Or: `. scripts/active-spec.sh` (prints and exports `ACTIVE_SPEC`)

- **⚡ DEVELOPMENT PROCESS - ENFORCE STRICTLY**
  - 🛑 **REQUIRED**: Plan and discuss approaches before coding - NO RUSHING
  - 🛑 **REQUIRED**: Make small, testable changes - NO BIG CHANGES
  - 🛑 **REQUIRED**: Eliminate duplicates proactively
  - 🛑 **REQUIRED**: Keep spec artifacts updated: `tasks.md`, `plan.md`, `spec.md`, contracts; log questions/assumptions in `research.md` — ALWAYS DOCUMENT

---

## Spec-Driven Development (Spec Kit)
- Specs live in `specs/<id>-<slug>/` and are the single source of truth for scope and progress.
- Key files:
  - `spec.md` — problem statement, goals, acceptance criteria
  - `plan.md` — implementation plan and milestones
  - `tasks.md` — actionable task list for day‑to‑day tracking
  - `research.md` — questions, decisions, and assumptions
  - `contracts/` — API contracts + related tests
- Copilot usage guidance:
  - Prefer suggestions aligned with the active spec’s `plan.md` and `tasks.md`.
  - When generating tests or routes, mirror contracts and acceptance criteria from the spec.
  - Surface uncertainties as comments in `research.md` rather than inventing behavior.

- **🔒 CODE QUALITY - NON-NEGOTIABLE STANDARDS**
  - ✅ **MANDATORY**: Handle errors and validate inputs - NO EXCEPTIONS
  - ✅ **MANDATORY**: Follow conventions and secure secrets - NEVER EXPOSE SECRETS
  - ✅ **MANDATORY**: Write clear, type-safe code - NO SHORTCUTS
  - ✅ **PRODUCTION RULE**: Remove ALL debug logs before production - CLEAN CODE ONLY

- **📐 DEVELOPMENT STANDARDS - ABSOLUTE REQUIREMENTS**
  - 🎯 **PRIORITY #1**: Simplicity and readability over clever solutions
  - 🎯 **APPROACH**: Start with minimal working functionality - BUILD INCREMENTALLY
  - 🎯 **CONSISTENCY**: Maintain consistent style throughout - NO STYLE MIXING

🔥 **FINAL WARNING**: If you violate these rules, you are COMPLETELY IGNORING the project standards!
