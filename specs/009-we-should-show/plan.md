# Implementation Plan: Conflicting Class Session Resolution

**Branch**: `009-we-should-show` | **Date**: 2025-09-25 | **Spec**: [./spec.md](./spec.md)
**Input**: Feature specification from `/home/user/Development/schedule-website/specs/009-we-should-show/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
When a user clicks to edit a conflicting class session, they will be navigated to the day calendar view for that day to see the conflict in context and resolve it. This avoids showing a modal and instead leverages the existing day calendar view for conflict resolution.

## Technical Context
**Language/Version**: TypeScript 5.8.3
**Primary Dependencies**: Next.js 15.4.7, React 19.0.0, Prisma 6.8.2, TanStack Query 5.69.0, Zustand 5.0.5, shadcn/ui, Tailwind CSS
**Storage**: PostgreSQL (via Prisma)
**Testing**: Vitest 2.0.5, React Testing Library
**Target Platform**: Web (Node.js environment via Next.js)
**Project Type**: Web application
**Performance Goals**: NEEDS CLARIFICATION
**Constraints**: NEEDS CLARIFICATION
**Scale/Scope**: NEEDS CLARIFICATION

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **PASS**: No constitutional violations detected.

## Project Structure

### Documentation (this feature)
```
specs/009-we-should-show/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/
```

**Structure Decision**: The project is a Next.js application, which combines frontend and backend. The existing structure under `src/` will be used.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task

2. **Generate and dispatch research agents**:
   - Research tasks for Performance Goals, Constraints, and Scale/Scope have been created in `research.md`.

3. **Consolidate findings** in `research.md`

**Output**: `research.md` with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - `Class Session` and `Class Series` entities and their attributes have been documented in `data-model.md`.

2. **Generate API contracts** from functional requirements:
   - No new API endpoints are required for this feature, as it is a UI flow change.

3. **Generate contract tests** from contracts:
   - No new contract tests are needed.

4. **Extract test scenarios** from user stories:
   - A `quickstart.md` file has been created with manual testing scenarios.

5. **Update agent file incrementally** (O(1) operation):
   - `GEMINI.md` will be updated with the context of this feature.

**Output**: data-model.md, /contracts/*, quickstart.md, GEMINI.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from the feature specification and the design documents.
- Create tasks for:
  - Modifying the click handler for the edit button on class sessions in the day calendar.
  - Implementing the logic to differentiate between conflicting and non-conflicting sessions.
  - Navigating to the day calendar view when a conflicting session is clicked.
  - Ensuring the standard "Edit Class" modal is shown for non-conflicting sessions.

**Ordering Strategy**:
- TDD order: Tests before implementation.
- Dependency order: Implement the logic to identify conflicting sessions first, then the UI changes.

**Estimated Output**: 5-10 numbered, ordered tasks in tasks.md

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [x] Phase 4: Implementation complete
- [x] Phase 5: Validation passed
  - Notes: Fast day calendar dialog header removed; modal now uses flex layout to maximize height.
  - Notes: Backported guard for PATCH /api/class-series/:seriesId to prevent P2025 when blueprint missing; returns 404/403 pre-update.

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/.specify/memory/constitution.md`*
