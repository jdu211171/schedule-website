# Data Model: User-Configurable Class Type Visibility

**Branch**: `017-add-logic-to`  
**Date**: 2025-10-11

## Entities

- Class Type
  - Description: Category applied to class sessions (e.g., 通常授業, 特別授業)
  - Key fields: `id` (existing type), `name`, `active`
  - Relationships: referenced by Class Session

- User Class Type Visibility Preference
  - Description: Per-user mapping of hidden Class Types
  - Key fields:
    - `user_id` (FK to Users)
    - `hidden_class_type_ids` (array of Class Type IDs)
    - `updated_at` (timestamp)
  - Behavior:
    - New Class Types default to visible (not included in hidden list)
    - Removed/renamed Class Types are ignored and cleaned during save

## Validation Rules

- `user_id` must refer to an existing, active user
- `hidden_class_type_ids` must contain only valid, active Class Type IDs
- Maximum number of IDs: reasonable upper bound (e.g., 100) to protect payloads
- Duplicate IDs are not allowed (client and server de-duplicate)

## State Transitions

- Hide Type: add ID to `hidden_class_type_ids`; update `updated_at`
- Unhide Type: remove ID from `hidden_class_type_ids`; update `updated_at`
- Reset: clear `hidden_class_type_ids`; update `updated_at`
- Cleanup: remove any IDs no longer valid

## Notes

- Per-user preferences persist across sessions/devices
- “Show all” override is a temporary client state and does not mutate the data model
