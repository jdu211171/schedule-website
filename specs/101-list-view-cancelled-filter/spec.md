# List View: Cancelled Class Filter in Class Type

## Problem
- In the schedules list (リスト) view, there was no way to filter only cancelled classes.
- Class types no longer have a dedicated "キャンセル" type; cancellations use `isCancelled`.

## Goal
- Add a "キャンセル" option into the 授業タイプ combobox that filters sessions to only cancelled when selected.

## Acceptance Criteria
- 授業タイプ combobox includes "キャンセル" at the top.
- Selecting it filters list results to only cancelled sessions.
- Clearing the field removes the filter.
- TypeScript passes.
