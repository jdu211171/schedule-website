# Feature Specification: Class Type Filters Across Schedule Views

**Feature Branch**: `014-we-should-add`  
**Created**: 2025-10-07  
**Status**: Draft  
**Input**: User description: "We should add a class type filter into `src/components/admin-schedule/DayCalendar/day-calendar-filters.tsx` for admin and staff users in both 日次 and 週次 view tabs. Teachers’ and students’ week class view table and monthly view should also support filtering by class types. Reference existing filter components and the searchable, selectable combobox filter. If possible, reference the シリーズ view’s table filter, which is multi-selectable and searchable, as the best implementation. Can we do that?"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing (mandatory)

### Primary User Story
As an admin or staff member, I want to filter classes shown on both the Daily (日次) and Weekly (週次) schedule views by one or more Class Types (e.g., 通常授業, 特別授業) so that I can focus on relevant sessions. As a teacher or student, I want the Week table and Monthly calendar to support the same Class Type filtering so I can quickly find the classes that matter to me.

### Acceptance Scenarios
1. Given the admin Daily (日次) view with many classes, When the user opens the Class Type filter and selects "通常授業", Then only sessions of type "通常授業" are displayed.
2. Given the admin Daily (日次) view, When the user multi-selects "通常授業" and "特別授業", Then sessions of either type are shown.
3. Given the admin Weekly (週次) view, When the user applies a Class Type selection in Daily view and switches to Weekly, Then the same selection remains active across the two tabs and persists globally for that role.
4. Given the admin Weekly (週次) view with no sessions matching the selected Class Types, When the filter is applied, Then the view shows a clear empty state (e.g., "該当する授業がありません").
5. Given the teacher Week view table, When the teacher selects one or more Class Types via a searchable control, Then only matching sessions appear in the table.
6. Given the student Week view table, When a Class Type filter is applied, Then the displayed sessions are limited to the selected types and the total count reflects the filtered set.
7. Given the student Monthly view, When the user selects Class Types, Then day cells show only lessons of the chosen types; tapping a day navigates to Week view with the same filter carried over and persisted.
8. Given any supported view with an active filter, When the user clears the filter, Then all Class Types are shown again (default state: no selection = all).
9. Given the filter control, When the user types in the search box within the filter, Then matching Class Type options are narrowed in real time.
10. Given any supported view with an active Class Type filter, When the user reloads the page or navigates away and returns, Then the prior selection persists (per-role, via local storage) and is reapplied.
11. Given a user switches between school branches, When a Class Type selection exists, Then the same selection remains (not scoped per branch) to match existing filter behavior.

### Edge Cases
- No available Class Types: The filter control indicates no options [NEEDS CLARIFICATION: Should the filter be hidden or disabled when no types exist?].
- Very large number of Class Types: The filter remains performant and searchable, and supports multi-select without excessive scroll.
- Accessibility: The filter is fully keyboard-operable and screen-reader friendly [NEEDS CLARIFICATION: Specific accessibility criteria to meet, e.g., WCAG level].
- Localization: All filter labels and empty states are localized (JA/EN as applicable) [NEEDS CLARIFICATION: Required locales].
- Persistence: Selection persists globally per role across views and across sessions via local storage; not encoded in URL or shared links.

## Clarifications

### Session 2025-10-07

- Q: How should Class Type filter selections persist across views and navigation? → A: Global per-role via local storage; cross-view; URL not required.
- Q: When a parent Class Type is selected, should filtering include descendant types? → A: Exact match only (no descendants).
- Q: What is the default “All” behavior when no Class Types are selected? → A: No selection means all types; no explicit “All” option.
- Q: Where should Class Type options and display labels come from? → A: Server-provided list (API) matching classTypeName used in sessions.
- Q: When users switch between branches, should the selection be the same or saved separately? → A: Same selection for all branches (align with existing filters).

## Requirements (mandatory)

### Functional Requirements
- FR-001: Provide a Class Type filter in the admin/staff Daily (日次) schedule view.
- FR-002: Provide a Class Type filter in the admin/staff Weekly (週次) schedule view.
- FR-003: Provide a Class Type filter in the teacher Week view table.
- FR-004: Provide a Class Type filter in the student Week view table.
- FR-005: Provide a Class Type filter in the student Monthly view (and any Monthly view where students/teachers browse schedules).
- FR-006: The filter MUST support multi-select of Class Types.
- FR-007: The filter MUST be searchable to quickly find Class Types by name/label.
- FR-008: When no Class Types are selected, the default state shows all Class Types [NEEDS CLARIFICATION: Confirm "no selection = all" vs explicit "All" option].
- FR-008: When no Class Types are selected, the default state shows all Class Types (no explicit “All” option; no selection = all).
- FR-009: The filter’s active state MUST be clearly visible and show the count or chips of selected Class Types.
- FR-010: Clearing the filter MUST restore the full, unfiltered schedule.
- FR-011: The filter behavior SHOULD be consistent across views and roles (labels, empty states, clear/reset behavior) and mirror the existing multi-select, searchable pattern used in the Series list filter.
 - FR-012: The filtering MUST operate on the same Class Type dimension used by schedules (matches the `classTypeName` users see); options and labels come from a server-provided list (API).
- FR-013: Active filter selection persists globally per role across views (日次↔週次, Week↔Month) and across sessions via local storage; URL parameters are not required.
- FR-014: For teacher/student flows, the selection persists between Week and Month views, across navigation and reloads, scoped per role and stored locally.
- FR-018: Selecting a Class Type filters by exact match only; selecting a parent type does not implicitly include descendant types.
- FR-019: Persistence is not scoped per branch; the same per-role selection applies across all branches (following existing filter patterns).
- FR-015: The filter MUST handle 0-results gracefully with a clear, localized empty state message.
- FR-016: The control MUST meet basic accessibility: keyboard navigation, focus management, ARIA labels, and contrast guidelines [NEEDS CLARIFICATION: exact standard].
- FR-017: The filter MUST not materially degrade schedule rendering performance at typical data sizes; interactions should remain responsive.

### Key Entities (data-related)
- Class Type
  - What it represents: A categorical label for a class session (e.g., 通常授業, 特別授業).
  - Key attributes: Identifier, display name (localized), optional color/legend mapping.
  - Relationships: Associated with Class Sessions; used as a facet in schedule views.
- Schedule View
  - Variants: Daily (日次), Weekly (週次), Monthly (月次), and Week table views used by teachers/students.
  - Behavior: Each view supports filtering by Class Type; filtered results update counts and lists/calendars.
- User Role
  - Roles: Admin, Staff, Teacher, Student.
  - Access: All see a Class Type filter in their relevant schedule contexts; admin/staff specifically in 日次/週次 tabs.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---
