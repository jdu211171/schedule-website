# Feature Specification: Global Class Type Filter Visibility (Admin-Controlled)

**Feature Branch**: `018-in-commit-a9a1a7d10907652c0c52a39f2bc00fe99491b851`  
**Created**: 2025-10-15  
**Status**: Draft  
**Input**: User description: "In commit a9a1a7d10907652c0c52a39f2bc00fe99491b851 (feat(class-types): per-user visibility for class type filter options (filters-only, no calendar hiding) (#267)) we introduced per-user class type filters, but now this should be changed to a global setting configurable only by administrators. This change must apply to students, teachers, and staff users. Remove the 表示管理 button and instead allow visibility to be managed in the masterdata (マスターデータ管理) under the 授業タイプ tab’s table by adding a toggle to each row. When the toggle is on, the class type is visible in the filter list, and when it is off, it is hidden. Reference existing code patterns to implement this consistently."

## Clarifications

### Session 2025-10-15

- Q: Which roles can change the global class type visibility in マスターデータ管理 > 授業タイプ? → A: Admins only
- Q: What should be the default state of the global visibility flag for existing and newly created class types? → A: ON for existing and new
- Q: How should we handle existing per-user visibility data from the prior feature? → A: Drop per-user visibility schema via migration
- Q: Should global visibility affect only filters or also hide content? → A: Filters-only; no content hiding
- Q: If class types support CSV import/export in マスターデータ管理, should the new `visibleInFilters` field be included? → A: Include in both import and export
- Q: Do we need audit logging for admin changes to class type visibility? → A: No audit logging

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Admin sets global visibility per class type (Priority: P1)

An administrator manages class type visibility globally from マスターデータ管理 > 授業タイプ by toggling a per-row switch. When on, the class type appears in filter lists for all users; when off, it is hidden for all users.

**Why this priority**: Core behavior change from per-user to global; enables consistent filtering across students, teachers, and staff.

**Independent Test**: As admin, toggle visibility for a class type and verify presence/absence in filter lists for a student, a teacher, and a staff account without any per-user preferences involved.

**Acceptance Scenarios**:

1. Given a class type with visibility ON, When any user opens a filter list, Then that class type is listed.
2. Given a class type with visibility OFF, When any user opens a filter list, Then that class type is not listed.
3. Given admin permission, When toggling a class type, Then the setting persists and reflects on next load across all relevant pages.

---

### User Story 2 - Remove per-user management UI (表示管理 button) (Priority: P2)

Users no longer manage class type visibility themselves. The 表示管理 button is removed wherever it controlled filter visibility.

**Why this priority**: Prevents conflicting per-user settings and enforces a single source of truth.

**Independent Test**: Verify the 表示管理 button is not rendered for students, teachers, or staff; confirm no per-user visibility UI paths are available.

**Acceptance Scenarios**:

1. Given any user role, When viewing pages that previously showed 表示管理, Then that control is absent.
2. Given any user role, When interacting with filter lists, Then options match the admin-defined global visibility.

---

### User Story 3 - All roles consume the global setting (Priority: P3)

Filter lists for students, teachers, and staff are driven solely by the global class type visibility, not per-user preferences.

**Why this priority**: Ensures uniform experience across roles and reduces configuration complexity.

**Independent Test**: Compare filter lists across one student, one teacher, and one staff account after admin toggles; lists match the same global set.

**Acceptance Scenarios**:

1. Given global visibility is set, When users of different roles view filters, Then they see the same set of class types.

---

### Edge Cases

- All class types set to hidden: filter list shows no class-type options without crashing; pages remain usable with graceful empty-state messaging.
- Permission enforcement: only admins can toggle; non-admins do not see the toggle and cannot change visibility via API.
- Caching/consistency: toggling updates are reflected on next data fetch; ensure server/API invalidation or client refetch follows existing patterns.
- Archived/disabled class types: visibility toggle does not resurrect archived items; archived logic remains authoritative.
- Migration state: per-user visibility schema is dropped via migration; no mixed mode. Ensure deployments apply the migration before removing code paths.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Introduce a global boolean visibility flag on class types (e.g., `visibleInFilters`) with default `true`; backfill existing class types to `true`.
- **FR-002**: Update マスターデータ管理 > 授業タイプ table to include a per-row toggle column to control `visibleInFilters`.
- **FR-003**: Only Admins can toggle visibility; Staff and Teachers cannot. Enforce authorization in UI and API/service layers.
- **FR-004**: Remove the 表示管理 button and any per-user visibility management UI across the app.
- **FR-005**: Filters-only: filter lists across all relevant pages include class types where `visibleInFilters` is true; content (e.g., calendar items) is not hidden by this setting.
- **FR-006**: Apply uniformly to students, teachers, and staff; per-user preferences must not affect the list.
- **FR-007**: Ignore any previously stored per-user visibility data; if present, it must not alter results.
- **FR-008**: Persist toggle changes to the database and reflect on subsequent fetches; follow existing data mutation and optimistic update patterns where applicable.
- **FR-009**: Maintain localization for labels (e.g., column label such as 「フィルター表示」) consistent with existing masterdata UI.
- **FR-010**: Add tests (unit/integration) covering admin toggle behavior, role-based visibility, and removal of per-user UI.
- **FR-011**: Remove per-user visibility schema via DB migration (drop related tables/columns/indexes). Eliminate all reads/writes to that schema and delete dead code.
- **FR-012**: No new audit logging required for visibility changes; do not emit audit events.
- **FR-013**: Include `visibleInFilters` in class type CSV import and export, following existing CSV boolean/header conventions used in masterdata.

### Key Entities _(include if feature involves data)_

- **ClassType**: `{ id, name, ... , visibleInFilters: boolean (default: true) }` — drives visibility in filter lists globally.
- **User/Role**: authorization determines who can toggle; all users consume the same filtered set.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Toggling a class type as admin changes filter visibility for all roles on next fetch within 1 page reload or data refetch.
- **SC-002**: 表示管理 button is removed across the product (0 occurrences in UI for non-admins and admins alike).
- **SC-003**: Students, teachers, and staff see identical class-type filter sets determined by `visibleInFilters`.
- **SC-004**: No regressions or errors when all class types are hidden; relevant pages remain stable and usable.
- **SC-005**: Existing class types backfilled to `visibleInFilters = true`; newly created class types default to `true` in UI/API/DB.
- **SC-006**: Per-user visibility schema dropped via migration; zero remaining code references; migration passes in staging and production.
- **SC-007**: Visibility toggles do not alter calendar or other content visibility; only filter option lists change.
- **SC-008**: No new audit events created when toggling visibility.
- **SC-009**: Class type CSV export includes `visibleInFilters`; CSV import correctly applies it using existing boolean conventions; round‑trip is lossless.
