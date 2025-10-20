# Quickstart: User-Configurable Class Type Visibility

**Branch**: `017-add-logic-to`

## Purpose

Enable each user to hide unnecessary Class Types so both the Day Calendar and Class Type filter controls remain focused and manageable.

## How to Demo

- Open the Day Calendar (admin/staff) or Week/Month views (teacher/student).
- Open the Class Type management UI (near the Class Type filter).
- Hide one or more Class Types and confirm:
  - Day Calendar no longer shows sessions of hidden types.
  - Class Type filter options exclude hidden types.
- Toggle “Show all” to temporarily reveal all types without saving.
- Click “Reset to default” to restore all visible and persist that state.
- Reload or sign in from a different browser/device; preferences persist.

## Edge Case Checks

- Hide all types: UI shows empty state with guidance to manage visibility.
- Add/remove/rename Class Types: New types appear by default; removed/renamed types are cleaned up on next save.
- Performance: Visibility changes reflect in under ~1s for up to 100 Class Types.

## Notes

- Preferences are per-user and persist across sessions/devices.
- “Show all” is a temporary override and does not change saved preferences.
