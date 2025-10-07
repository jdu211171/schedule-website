# Research: Class Type Filters Across Schedule Views

## Decisions
- Persistence model: Per-role via localStorage; cross-view; across reloads; same across branches.
  - Rationale: Matches existing filters’ persistence patterns; minimal overhead.
  - Alternatives: URL params (shareable) rejected per spec; server-side profile rejected as scope creep.

- Filter semantics: Exact match only; selecting a parent does not include descendants.
  - Rationale: Clear, predictable filtering; avoids hidden hierarchy coupling.
  - Alternatives: Include descendants or a toggle; deferred to future if needed.

- Default “All”: No selection = all (no explicit “All” option).
  - Rationale: Aligns with existing table filters and reduces UI noise.

- Source of truth for options: Server API `GET /api/class-types` (ordered by `order`, then `name`).
  - Rationale: Centralized, up-to-date list; avoids client drift.
  - Alternatives: Faceted uniques from current view rejected (incomplete set).

- Branch scoping: Same selection across all branches.
  - Rationale: Simpler UX, consistent with other persisted filters.

- Empty options behavior: Show the control disabled with an informative hint (e.g., "クラスタイプがありません").
  - Rationale: Discoverability; hides less capability compared to removing control.

## Accessibility & Localization (Non-blocking Assumptions)
- Accessibility: Target keyboard operability and ARIA for combobox and chips. Aim for WCAG 2.1 AA.
- Localization: Provide JA strings; keep text extractable for future EN.

## Endpoints & Data
- Existing: `GET /api/class-types` returns paginated class type list (server truth).
- Proposed: Support `classTypeIds` (CSV or repeated) for teacher/student me endpoints to allow server-side filtering for multi-select.
  - If not implemented immediately, fall back to client-side filtering on fetched results.

## Risks
- Multi-select server filtering may require API changes and pagination considerations in `teachers/students me` endpoints.
- Client-side filtering on large result sets could impact performance; mitigate with pagination or server-side support.

## Open Items (non-blocking)
- Exact accessibility acceptance checklist.
- Confirm localized copy for empty/zero-results states.

