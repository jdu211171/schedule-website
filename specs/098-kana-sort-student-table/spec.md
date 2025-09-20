# Kana Column Sorting (Student Table)

## Problem
- The student table cannot sort the カナ (kanaName) column.
- Mixed hiragana/katakana should sort like A–Z (phonetic order), mirroring the simple sorting UI seen on other sortable columns.

## Goal
- Add clickable sort UI for カナ column.
- Add server support to sort by kana across pages.
- Keep code changes minimal and consistent with existing table patterns.

## Acceptance Criteria
- Clicking the カナ header toggles ascending/descending and updates results across pages.
- API accepts `sortBy=kanaName&sortOrder=asc|desc`.
- TypeScript passes, no lint regressions.
