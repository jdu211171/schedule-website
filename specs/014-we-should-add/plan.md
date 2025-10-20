# Implementation Plan: Class Type Filters Across Schedule Views

**Branch**: `014-we-should-add` | **Date**: 2025-10-07 | **Spec**: specs/014-we-should-add/spec.md
**Input**: Feature specification from `specs/014-we-should-add/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from repository structure (Next.js web app)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → Remaining ambiguities are non-blocking; document assumptions
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific file
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach and prepare tasks.md
9. STOP - Ready for /tasks command
```

## Summary

Add a searchable, multi-select Class Type filter across schedule views:

- Admin/Staff: Daily (日次) and Weekly (週次) tabs
- Teacher: Week table and Month calendar
- Student: Week table and Month calendar

Behavior clarified in spec:

- Multi-select, searchable options (from server API)
- Persistence: global per role via localStorage, cross-view and across reloads; same across branches
- Exact match only (no descendants)
- No selection = all types (no explicit “All” option)

## Technical Context

**Language/Version**: TypeScript (React 18, Next.js App Router), Bun runtime  
**Primary Dependencies**: Next.js, React, TanStack Table, React Query, Tailwind CSS v4, Prisma  
**Storage**: PostgreSQL via Prisma  
**Testing**: Vitest + React Testing Library (preferred)  
**Target Platform**: Web (Next.js)  
**Project Type**: web  
**Performance Goals**: Filter interactions respond <100ms client-side; no noticeable degradation in schedule rendering  
**Constraints**: Persist selection per role via localStorage; reuse existing filter patterns/components; avoid schema changes if possible  
**Scale/Scope**: Typical view sizes: up to a few hundred sessions per week; class type list expected O(10–100)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Simplicity first: reuse existing faceted/combobox patterns → PASS
- Test-first posture: plan includes contract/integration tests → PASS
- Observability/versioning constraints: N/A for UI-only change; minimal API changes proposed → PASS
- Any NEEDS CLARIFICATION blocking? Remaining items are non-blocking (a11y level, locales, empty options behavior) → PASS with notes in research

## Project Structure

### Documentation (this feature)

```
specs/014-we-should-add/
├── plan.md              # This file (/plan output)
├── research.md          # Phase 0 output (/plan)
├── data-model.md        # Phase 1 output (/plan)
├── quickstart.md        # Phase 1 output (/plan)
├── contracts/           # Phase 1 output (/plan)
└── tasks.md             # Phase 2 output (/plan prepared; refined by /tasks)
```

### Source Code (repository root)

```
src/
├── app/
│   ├── api/
│   │   ├── class-types/route.ts                 # Class types list API (server source of truth)
│   │   ├── teachers/me/class-sessions/route.ts  # Accepts classTypeId (extend to multi)
│   │   └── students/me/class-sessions/route.ts  # Accepts classTypeId (extend to multi)
│   └── teacher/page.tsx                         # Hosts Week/Month viewer; add filter state
├── components/
│   ├── admin-schedule/DayCalendar/day-calendar-filters.tsx   # Add class type filter (admin 日次)
│   ├── admin-schedule/WeekCalendar/admin-calendar-week.tsx    # Add class type filter (admin 週次)
│   ├── student-schedule/student-schedule-week-viewer.tsx      # Respect filter
│   └── student-schedule/student-schedule-month-viewer.tsx     # Respect filter
└── lib/
    ├── data-table.ts                          # Filter helpers (reference patterns)
    └── class-type-colors.ts                   # Legend mapping (informative only)
```

**Structure Decision**: Web application (Next.js). Modify components under `src/components/*` and, if needed, adjust API handlers under `src/app/api/*` to support multi-select `classTypeIds` in teacher/student “me” endpoints.

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - Accessibility standard: target WCAG 2.1 AA keyboard operability for comboboxes
   - Localization coverage: prioritize JA; keep strings localizable; EN optional
   - Empty options behavior: show control disabled with “no class types” hint

2. **Generate and dispatch research agents**:
   - Patterns: reuse `DataTableFacetedFilter` and `ui/combobox` for multi-select + search
   - API: `GET /api/class-types` for options; verify pagination and sorting by order then name
   - Teacher/Student endpoints: assess adding `classTypeIds` vs client-side filtering

3. **Consolidate findings** in `research.md` using format:
   - Decision: what was chosen
   - Rationale: why chosen
   - Alternatives considered: what else evaluated

**Output**: research.md with key decisions and non-blocking assumptions documented

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:
   - ClassType, FilterState (per-role persistence), ViewVariant

2. **Generate API contracts** from functional requirements:
   - `GET /api/class-types` (options; ordered)
   - `GET /api/teachers/me/class-sessions?classTypeIds=…` (multi-select)
   - `GET /api/students/me/class-sessions?classTypeIds=…` (multi-select)

3. **Generate contract tests** from contracts:
   - One test stub per endpoint (schema assertions; initially pending)

4. **Extract test scenarios** from user stories:
   - Acceptance scenarios 1–11 → integration test plan

5. **Update agent file incrementally**:
   - Run `.specify/scripts/bash/update-agent-context.sh codex`

**Output**: data-model.md, /contracts/\*, contract test stubs, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do_

**Task Generation Strategy**:

- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P]
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:

- TDD order: Tests before implementation
- Dependency order: API contracts → UI filters → wiring → persistence
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | —          | —                                    |

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved (remaining items non-blocking; see research)
- [ ] Complexity deviations documented

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
