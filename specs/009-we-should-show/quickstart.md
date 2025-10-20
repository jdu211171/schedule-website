# Quickstart for Conflicting Class Session Resolution

1.  **Create a conflicting class session:**
    - Create two class sessions on the same day, with overlapping times and the same teacher.
2.  **Verify the conflict:**
    - Go to the day calendar view for that day.
    - You should see both sessions, and they should be marked as conflicted.
3.  **Test the feature:**
    - Click the "edit" button on one of the conflicting sessions.
    - You should be navigated to the day calendar view for that day.
4.  **Test the non-conflicting case:**
    - Create a class session that does not conflict with any other session.
    - Click the "edit" button on that session.
    - The "Edit Class" modal should appear.

## Validation Notes

- Code-level validation performed:
  - Typecheck: `bun run check-errors` passed.
  - Targeted tests: `./node_modules/.bin/vitest run --environment=jsdom tests/integration/conflict-resolution.spec.tsx tests/unit/lesson-card.spec.tsx` passed.
- Manual UI steps (recommended):
  - `bun dev` → open `/dashboard/schedules`, select a branch.
  - Use the Day tab to create overlapping sessions with the same teacher.
  - Click the conflicted lesson card: expect to remain in Day view and not open the edit modal.
  - Click a non-conflicted lesson card: expect the standard "授業の編集" modal.
