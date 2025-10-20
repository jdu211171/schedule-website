# Quickstart — Validate instant day calendar update

## Prereqs

- Run dev: `bun dev`
- Ensure timezone utilities use Asia/Tokyo (default)
- Seed data available (optional) via `npx prisma studio` or existing seed

## Steps

1. Open the admin Day Calendar for date D.
2. Create a regular class session for date D via the calendar dialog.
   - Expectation: New session tile appears in correct slot within 1s; no full reload.
3. Open a second tab on the same date D (same user). Create another session in the first tab.
   - Expectation: Second tab reflects the new session within 1s; no reload.
4. Apply a filter that excludes the session (e.g., different teacher). Create a session that does not match.
   - Expectation: No tile appears; a generic success toast is shown; filters are unchanged.
5. Create a session on date D2 while current view is D.
   - Expectation: Current view remains unchanged; navigating to D2 shows the session.
6. Trigger an error (e.g., invalid time range).
   - Expectation: Error toast; no tile inserted.

## Notes

- Scroll/zoom state remains unchanged; no auto-scroll after creation.
- Cross-user updates are out of scope.
