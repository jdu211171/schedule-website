
# Implementation Plan: Production CSV Import Reliability

**Branch**: `015-i-m-using` | **Date**: 2025-10-08 | **Spec**: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/015-i-m-using/spec.md
**Input**: Feature specification from `/specs/015-i-m-using/spec.md`

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
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
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
Improve production CSV import reliability and user feedback. Ensure imports complete within target performance for typical files (≤10 MB or ≤10k rows in ≤60s), support encodings UTF-8 and Shift_JIS, process valid rows while skipping invalid with a detailed report, and upsert by internal database ID. Provide localized (JP/EN) error messages, clear summaries, and audit logging. Address the current production failure where imports error with a generic message.

## Technical Context
**Language/Version**: TypeScript (strict) on Bun; Next.js App Router  
**Primary Dependencies**: Next.js, Zod, Prisma, Tailwind CSS v4  
**Storage**: Supabase PostgreSQL (production), local Postgres for ops verification via psql  
**Testing**: Vitest + React Testing Library (preferred), contract tests in spec folder  
**Target Platform**: Web (Next.js), deployed to production  
**Project Type**: web (Next.js app with API routes)  
**Performance Goals**: Typical import ≤10 MB or ≤10k rows completes ≤60s; non-blocking UX for larger imports  
**Constraints**: Use Bun for packages; enforce TS strict; local DB ops via psql; localized JP/EN errors; handle UTF-8 and Shift_JIS; upsert by internal DB ID  
**Scale/Scope**: CSV imports up to typical 10k rows; propose conservative hard cap pending ops limits

Technical Context (arguments): $ARGUMENTS

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file contains placeholders; no explicit constraints defined. Plan aligns with repo standards: simplicity, security, localization, and observability.  
Initial Check: PASS

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
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

**Structure Decision**: Web (Next.js app router). Implement via API route under `src/app/api/import/csv/route.ts`, UI in `src/components/import/CSVImportDialog.tsx`, and supporting libs in `src/lib`, `src/schemas`, `src/types`.

#### Concrete Structure
```
src/
├── app/
│  ├── api/
│  │  └── import/
│  │     └── csv/route.ts                 # CSV import API (stream parse + upsert)
│  ├── (routes and pages)
│  └── layout.tsx
├── components/
│  └── import/
│     └── CSVImportDialog.tsx             # Upload UI, progress, results
├── lib/
│  ├── csv-importer.ts                    # Streaming CSV parse, validation (Zod)
│  ├── csv-encoding.ts                    # UTF-8/Shift_JIS detection + decode
│  └── import-audit.ts                    # Audit logging helper
├── services/
│  └── import-service.ts                  # Orchestrates session, upsert, summary
├── schemas/
│  └── import-row-schema.ts               # Zod schema for row validation
└── types/
   └── import.ts                          # Import types (session, result)

tests/
├── contract/
│  └── import-api.contract.test.ts        # Contract tests (spec-driven)
├── integration/
│  └── import.integration.test.ts
└── unit/
   ├── csv-importer.test.ts
   └── encoding-detect.test.ts
```

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all critical NEEDS CLARIFICATION resolved or documented as provisional decisions

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh codex`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, quickstart.md, agent-specific file (tests scaffolded in spec folder)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (critical paths)
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
