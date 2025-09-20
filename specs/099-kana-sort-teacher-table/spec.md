# Kana Column Sorting (Teacher Table)

## Problem
- Teacher table lacks sorting for カナ (kanaName).
- We want the same server-side kana sorting pattern used in the student table.

## Goal
- Clickable カナ header sorts by kanaName asc/desc across pages.
- Backend accepts `sortBy=kanaName&sortOrder=asc|desc`.

## Acceptance Criteria
- Sorting updates results across pages (server-driven).
- TypeScript passes with no new warnings.
