# Implementation Plan: User-Configurable Class Type Visibility

**Branch**: `017-add-logic-to` | **Date**: 2025-10-11 | **Spec**: /home/user/Development/schedule-website/specs/017-add-logic-to/spec.md
**Input**: Feature specification from `/specs/017-add-logic-to/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Provide per-user control to hide unnecessary Class Types so the Day Calendar and class type filter controls only show relevant options. Preferences persist per user across sessions/devices. Hidden types are excluded from calendar rendering and from filter option lists. Include a temporary “Show all” override and a “Reset to default” action.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (strict)  
**Primary Dependencies**: Next.js App Router, React, Zod, Prisma (existing), Tailwind CSS  
**Storage**: PostgreSQL (persist per-user class type visibility preferences)  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Web (admin/staff/teacher/student schedule views)
**Project Type**: Web application (frontend + API routes within Next.js)  
**Performance Goals**: UI reflects visibility changes within ~1s for ≤100 Class Types  
**Constraints**: Do not degrade schedule render responsiveness; accessible controls; no invisible-but-active filters  
**Scale/Scope**: Up to 100 Class Types; thousands of sessions per day across views

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Source: `.specify/memory/constitution.md` contains only placeholders (no concrete rules). Therefore, no explicit constitutional constraints are currently enforceable.

Derived gates (from repository guidelines):

- Use Spec Kit for planning and tracking; keep `spec.md`, `plan.md`, and create `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.
- Use Bun for packages; fix TypeScript errors after changes (tracked for implementation phase).
- Prefer local PostgreSQL via psql for ops (tracked for ops validation phase).

Pre-design status: PASS (no violations).
Post-design status: PASS (see re-check below).

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
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

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: Web application within Next.js App Router using existing folders. Add minimal API endpoints and client hooks for per-user class type visibility. Source roots: `src/app`, `src/components`, `src/lib`, `src/hooks`, `src/services`, `src/schemas`, `src/types`, `prisma/`, `scripts/`.

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
