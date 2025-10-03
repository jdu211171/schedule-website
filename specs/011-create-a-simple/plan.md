
# Implementation Plan: Password Change UI

**Branch**: `011-create-a-simple` | **Date**: 2025-10-03 | **Spec**: [./spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-create-a-simple/spec.md`

## Summary
This plan outlines the implementation of a simple UI for users of all roles (Admin, Staff, Teacher, Student) to change their own passwords. The UI will be a modal dialog accessible from the user menu dropdown. The technical approach involves creating a new API endpoint (`/api/auth/change-password`) that handles password verification and updates conditionally based on user role, using `bcryptjs` for hashing where required. The frontend will be a new React component using `shadcn/ui` and TanStack Query for state management.

## Technical Context
**Language/Version**: TypeScript (Next.js)
**Primary Dependencies**: Next.js, NextAuth.js v5, Prisma, react-hook-form, zod, TanStack Query, shadcn/ui, bcryptjs
**Storage**: PostgreSQL (via Prisma)
**Testing**: Manual testing as per quickstart.
**Target Platform**: Web
**Project Type**: Web
**Structure Decision**: Option 2: Web application

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- All principles adhered to. No violations.

## Project Structure

### Documentation (this feature)
```
specs/011-create-a-simple/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── change-password.md # Phase 1 output
└── tasks.md             # Phase 2 output
```

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [x] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented: None
