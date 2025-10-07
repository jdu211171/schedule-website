# Implementation Plan: Instant day calendar update after session creation

**Branch**: `013-when-i-create` | **Date**: 2025-10-07 | **Spec**: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/013-when-i-create/spec.md
**Input**: Feature specification from `/specs/013-when-i-create/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands, but per instructions we also generated tasks.md in this run.

## Summary
- Primary requirement: Newly created regular class sessions appear immediately in the day calendar without a page refresh, within 1 second, preserving view state.
- Clarified scope: Same-user tabs auto-update; Asia/Tokyo display timezone; generic success toast if filtered; creation occurs via same-page popup; do not auto-scroll after creation.
- Non-goals: Cross-user real-time updates; route navigation or quick-jump; modifying filters automatically.

## Technical Context
**Language/Version**: TypeScript (strict) + React 18 + Next.js App Router  
**Primary Dependencies**: Next.js, Tailwind CSS v4, sonner (toasts), next-auth, Prisma (existing), PostgreSQL  
**Storage**: PostgreSQL via Prisma (no schema changes expected)  
**Testing**: Vitest + React Testing Library (per repo guidelines)  
**Target Platform**: Web (Next.js runtime)
**Project Type**: Single web app (frontend + API in `src/app`)  
**Performance Goals**: Calendar reflects new session within 1s of successful creation (p95)  
**Constraints**: No full page reload; preserve date, scroll, zoom; no auto-scroll after creation  
**Scale/Scope**: Typical admin usage; no cross-user fanout (same-user tabs only)

Technical Context (from arguments): No additional details provided.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Simplicity first: Local optimistic UI + same-user tab sync; no new services. PASS
- Test-first: Add UI interaction tests around calendar update and filter behavior. PASS
- Observability: User-visible toasts for success/error outcomes. PASS
- Versioning/Breaking changes: No API or schema changes. PASS

## Project Structure

### Documentation (this feature)
```
specs/013-when-i-create/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (generated here per instructions)
```

### Source Code (repository root)
```
src/
├── app/
│   └── api/
│       └── class-sessions/
│           ├── route.ts                     # POST create (existing)
│           └── [classId]/route.ts           # PUT/PATCH/DELETE (existing)
├── components/
│   ├── admin-schedule/
│   │   ├── DayCalendar/
│   │   │   ├── lesson-dialog.tsx            # Create/edit dialog (existing)
│   │   │   ├── fast-day-calendar-dialog.tsx # Quick create (existing)
│   │   │   └── types/
│   │   │       └── class-session.ts         # Types (existing)
│   │   └── date.ts                          # TZ helpers (Asia/Tokyo)
│   └── class-series/
│       ├── class-series-table.tsx           # Series list
│       ├── series-sessions-drawer.tsx       # Same-page popup
│       └── series-sessions-table-dialog.tsx # Series sessions dialog
├── hooks/                                   # Reusable hooks (existing)
├── lib/                                     # Utilities (existing)
└── services/                                # Service calls (existing)
```

**Structure Decision**: Single Next.js web app. Changes are limited to admin DayCalendar components and related hooks. No backend/schema changes required.

## Phase 0: Outline & Research
1. Extract unknowns from Technical Context above:
   - Performance baseline definition; secondary summaries in scope; quick-jump UX.
2. Consolidate findings in `research.md` using format:
   - Decision / Rationale / Alternatives considered

**Output**: research.md capturing decisions/assumptions (remaining non-critical items documented as deferred)

## Phase 1: Design & Contracts
1. Extract entities from feature spec → `data-model.md`:
   - Class Session; Day Calendar View; Class Series. No schema changes.
2. Generate contracts from functional requirements:
   - UI event contract for cross-tab update (same-user): Broadcast channel message schema.
   - Reference existing create API (no new endpoints).
3. Extract test scenarios into `quickstart.md` for manual verification.
4. Update agent file incrementally via `.specify/scripts/bash/update-agent-context.sh codex`.

**Output**: data-model.md, /contracts/*, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
Plan the tasks (see tasks.md) to implement optimistic UI update, cache/state update in current tab, cross-tab sync for same user, and filter-aware success messaging.

## Phase 3+: Future Implementation
Beyond the scope of /plan.

## Complexity Tracking
| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|

## Progress Tracking
**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
