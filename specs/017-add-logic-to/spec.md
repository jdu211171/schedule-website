# Feature Specification: User-Configurable Class Type Visibility

**Feature Branch**: `017-add-logic-to`  
**Created**: 2025-10-11  
**Status**: Draft  
**Input**: User description: "Add logic to control the number of class types displayed in the day calendar and other class type filters, allowing each user to decide their own preferences. Implement functionality similar to hiding table headers, so users can hide unnecessary class types and prevent some of the class type options from appearing in the select list, keeping the filter options manageable."

## User Scenarios & Testing (mandatory)

### User Story 1 - Hide unnecessary class types (Priority: P1)

As a user viewing schedules, I can choose which Class Types are visible so that my Day Calendar and filter controls only show the types I care about.

**Why this priority**: Reduces cognitive load and speeds up everyday schedule review by removing irrelevant options.

**Independent Test**: From a fresh state with all Class Types visible, a user hides one or more types and immediately sees them disappear from the Day Calendar and from Class Type selection controls.

**Acceptance Scenarios**:

1. Given the Day Calendar with multiple Class Types, When the user hides “特別授業”, Then Day Calendar no longer displays sessions of type “特別授業”.
2. Given any Class Type filter control (combobox/select), When the user has hidden “特別授業”, Then “特別授業” no longer appears as an option in the control.

---

### User Story 2 - Manageable filter options (Priority: P2)

As a user, I want filter controls to remain manageable by excluding hidden Class Types from selectable options so I can find relevant filters quickly.

**Why this priority**: Prevents long option lists from becoming unwieldy, improving accuracy and speed.

**Independent Test**: After hiding several Class Types, opening any Class Type filter shows only the remaining visible types; typing to search does not return hidden types.

**Acceptance Scenarios**:

1. Given a filter control with 20+ Class Types, When the user hides 10 types, Then the control shows only the remaining 10 and searching never returns the hidden 10.

---

### User Story 3 - Quick override and reset (Priority: P2)

As a user, I can quickly restore all Class Types temporarily (Show All) or permanently (Reset to defaults) so I can occasionally review everything and then revert to my focused view.

**Why this priority**: Supports periodic audits or exceptions without permanently changing preferences.

**Independent Test**: Activating “Show all” reveals all Class Types for the current view/session; using “Reset” restores the default state (all visible) and persists that state.

**Acceptance Scenarios**:

1. Given some Class Types are hidden, When the user toggles “Show all”, Then all Class Types appear in the Day Calendar and all filter controls until the override is turned off or the user navigates away.
2. Given some Class Types are hidden, When the user selects “Reset to default”, Then all Class Types become visible and that state is saved for future visits.

---

### User Story 4 - Preferences persist per user (Priority: P3)

As a returning user, my chosen visibility of Class Types persists across sessions and devices so that I don’t need to redo setup each time.

**Why this priority**: Saves time and ensures consistency across daily workflows.

**Independent Test**: User hides several Class Types, signs out, and later returns on another device; the same Class Types remain hidden without reconfiguration.

**Acceptance Scenarios**:

1. Given a user with saved preferences, When they open the app on a different device, Then the Day Calendar and filter controls reflect the same hidden/visible Class Types.

---

### User Story 5 - New and legacy Class Types (Priority: P3)

As a user, newly introduced Class Types are visible by default so I don’t miss new offerings, and removed/renamed types don’t cause errors or stale entries.

**Why this priority**: Avoids missing new types and reduces maintenance overhead.

**Independent Test**: A new Class Type appears in the system and is shown until a user chooses to hide it; deleted types no longer affect preferences.

**Acceptance Scenarios**:

1. Given a new Class Type is added, When the user opens the filter, Then the new type appears as selectable until they hide it.
2. Given a Class Type is removed from the system, When loading preferences, Then no errors occur and the removed type is ignored/cleaned up.

### Edge Cases

- All Class Types hidden: The Day Calendar shows a clear empty state with guidance to adjust visibility; Class Type filters show a “no options available” message and a link/action to manage visibility.
- Hidden types present in existing selections: Hidden Class Types are automatically deselected from any active filters to avoid invisible-but-active states; a brief non-intrusive notice indicates the update.
- No Class Types configured in the system: The Day Calendar and controls show an appropriate empty state; no errors occur.
- Very large list of Class Types (50+): Hiding/unhiding remains responsive and search excludes hidden types.

### Assumptions & Dependencies

Assumptions

- The feature applies to authenticated users; preferences are associated with a user account and intended to sync across devices.
- Hidden Class Types remove options from Class Type filter lists ONLY (they do not change Day Calendar rendering).
- “Show all” is a temporary per-view/session override for filter options; navigating away or toggling off returns to saved visibility.
- New Class Types default to visible until a user chooses to hide them.

Dependencies

- A defined Class Type taxonomy already exists and is attached to class sessions.
- The Day Calendar and all existing Class Type filter controls consume a single source of truth for current visibility and filterable options.
- A user identity context exists so preferences can persist per user across sessions/devices.

### Out of Scope

- Creating, editing, renaming, or deleting Class Types.
- Organization- or role-level default visibility policies managed by admins.
- Reordering Class Types or customizing names/labels.
- Performance optimizations beyond the responsiveness targets stated in Success Criteria.

## Requirements (mandatory)

### Functional Requirements

- FR-001: Users MUST be able to manage visibility of individual Class Types via an intuitive control accessible from the Day Calendar and from Class Type filter areas.
- FR-002: Managing visibility MUST ONLY affect Class Type filter option lists; the Day Calendar SHALL NOT hide sessions based on this preference.
- FR-003: All Class Type filter controls across the app MUST exclude hidden Class Types from selectable options and search results.
- FR-004: If any active filter includes a Class Type that becomes hidden, the system MUST automatically deselect it and keep the filter state valid without errors.
- FR-005: Users MUST have a “Show all” temporary override that reveals all types for the current viewing session without changing saved preferences.
- FR-006: Users MUST have a “Reset to default” action that restores “all visible” and persists that state for future sessions.
- FR-007: Visibility preferences MUST persist per user across sessions and devices.
- FR-008: New Class Types MUST default to visible; removed/renamed types MUST not break preference loading and SHOULD be cleaned from saved preferences on next update.
- FR-009: The UI MUST provide clear affordances, labels, and accessible keyboard/screen-reader navigation for managing visibility and understanding when some Class Types are hidden.
- FR-010: The system MUST surface a clear empty state when all Class Types are hidden and provide a direct path to manage visibility.
- FR-011: Typical interactions (toggle hide/unhide, open filter controls) SHOULD remain responsive for typical data sizes (e.g., up to 100 Class Types) with visible updates perceived within ~1 second.
- FR-012: Error cases (e.g., failed save of preferences) MUST show a user-friendly message and MUST NOT block continued use of the calendar or filters (the last known good state remains applied).

### Key Entities (include if feature involves data)

- Class Type: The categorization applied to a class session (e.g., 通常授業, 特別授業). Key attributes: Id, Name, Active/Inactive.
- User Class Type Visibility Preference: Per-user mapping of which Class Types are hidden. Key attributes: User Id, Hidden Class Type Ids (list), Updated At.

## Success Criteria (mandatory)

### Measurable Outcomes

- SC-001: 90% of users can hide or unhide a Class Type in under 30 seconds the first time without instructions.
- SC-002: After configuring preferences, Class Type filter lists shrink by at least 40% for users who hide 40%+ of types (as measured by option count), improving option discovery speed.
- SC-003: With 100 or fewer Class Types, visibility changes reflect in the Day Calendar and filter controls within 1 second in 95% of interactions.
- SC-004: Preferences persist across sessions and devices for 99% of successful sign-ins, with no data loss observed over a 30-day period.
- SC-005: Zero instances of invisible-but-active filters in QA: hidden Class Types do not remain selected in any filter after being hidden.
