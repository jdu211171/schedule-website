# Quickstart: Validate Cancelled Lessons Excluded from Conflicts

## Run locally
`bun dev`

Open the Admin Day Calendar view.

## Steps
1. Identify a day with an active lesson and a cancelled lesson that overlap in time.
2. Toggle “キャンセル授業を表示” ON.
3. Confirm both lessons are visible.
4. Verify the active lesson is NOT marked as conflicting due to the cancelled lesson.
5. Create two overlapping active lessons and confirm a conflict indicator appears regardless of the toggle.

## Notes
- Toggle controls visibility only; conflicts are computed among active lessons.
- No backend changes required.

## Testing selectors & assumptions
- Conflict visual is exposed via `data-conflict` attribute on each LessonCard container.
- Tests read all cards with `document.querySelectorAll('[data-conflict]')` and expect `"true"` for conflicted, `"false"` otherwise.
- For jsdom, tests polyfill `ResizeObserver` and wrap components with `QueryClientProvider` from `@tanstack/react-query`.
