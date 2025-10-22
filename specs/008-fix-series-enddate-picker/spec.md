# Fix series endDate picker behavior

## Problem

- In シリーズ table, clicking any day in the endDate calendar immediately updates the value without explicit confirmation.
- Clicking the X button in the picker clears the endDate (sets to null) instead of just closing the picker.

## Goals

- Require explicit confirmation (Apply) before persisting changes.
- Make the X button close the popover without modifying data.
- Preserve existing UX patterns and styling.

## Acceptance Criteria

- Selecting a date does not update endDate until the user clicks 適用 (Apply).
- クリア (Clear) sets endDate to null only when confirmed via 適用.
- キャンセル (Cancel) and closing the popover keep the original value.
- The trigger button continues to display the persisted value.
