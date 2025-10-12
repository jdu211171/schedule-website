# Research: User-Configurable Class Type Visibility

**Branch**: `017-add-logic-to`  
**Date**: 2025-10-11  
**Spec**: /home/user/Development/schedule-website/specs/017-add-logic-to/spec.md

## Decisions and Rationale

### 1) Preference persistence location
- Decision: Persist per-user Class Type visibility preferences in the application database.
- Rationale: The feature requires cross-device persistence (spec FR-007). Server-side storage ensures preferences follow the user regardless of device/browser and survive cache clears.
- Alternatives considered:
  - Local storage only: Fails cross-device requirement; prone to loss on cache clear/private mode.
  - Cookies: Same cross-device limitation and size constraints; privacy concerns.

### 2) Data model structure
- Decision: Single table to store per-user hidden Class Type IDs as an array field with metadata.
- Suggested schema (conceptual):
  - user_class_type_visibility_preferences
    - user_id (FK to users)
    - hidden_class_type_ids (array of ClassType IDs)
    - updated_at (timestamp)
- Rationale: Compact, easy to fetch/update; aligns with “hide list” semantics. New types default to visible without schema changes.
- Alternatives considered:
  - One row per (user_id, class_type_id): More rows, more churn; overkill for toggling several IDs at once.
  - JSON object keyed by class type: Similar to array; arrays keep ordering simple and storage smaller.

### 3) API contract
- Decision: Provide `GET /api/preferences/class-types` and `PUT /api/preferences/class-types` for reading/updating the hidden IDs.
- Rationale: Minimal, role-agnostic interface; supports the client use cases (initial load, toggle, reset).
- Alternatives considered:
  - PATCH per-ID endpoints: Higher request volume without clear benefit.
  - Embed into unrelated endpoints: Couples concerns and complicates caching/testing.

### 4) Hidden types behavior
- Decision: Hidden types are removed from Class Type filter option lists and excluded from Day Calendar rendering; a temporary “Show all” override exposes all types without altering saved preferences.
- Rationale: Matches the user need to keep filters manageable and views uncluttered while enabling one-click full visibility for audits.
- Alternatives considered:
  - Dim/mark hidden types but leave selectable: Adds noise back into filters; contradicts “keep manageable”.

### 5) New/removed/renamed Class Types
- Decision: New Class Types default to visible. Removed/renamed types are ignored and cleaned from saved preferences upon next update/save.
- Rationale: Prevents missed new offerings and eliminates stale IDs.
- Alternatives considered:
  - Default new types to hidden: Users could miss them.

### 6) Identity and access
- Decision: Use the existing authenticated user context to associate preferences by user ID.
- Rationale: Keeps behavior consistent with other per-user settings.
- Alternatives considered:
  - Per-role or per-organization defaults: Out of scope per spec; can be future work.

## Resolved Unknowns

All clarifications are resolved. No [NEEDS CLARIFICATION] remain.

## Implementation Notes (Non-binding)
- UI entry points: Day Calendar and Class Type filter areas provide access to manage visibility, “Show all” toggle, and “Reset”.
- Performance: Client applies preference filtering in memory for current view data; server limits only when explicitly requested.
- Accessibility: Ensure controls are keyboard reachable and screen reader friendly.
