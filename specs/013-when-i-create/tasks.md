# Tasks — Instant day calendar update after session creation

1. [x] DayCalendar: Insert newly created session into current view without reload.
   - Ensure placement uses Asia/Tokyo utilities in `src/components/admin-schedule/date.ts`.
   - Respect active filters; do not render if excluded.

2. [x] Show generic success toast after successful creation.
   - No filter-specific messaging; no auto-adjust of filters.

3. [x] Preserve view state on create.
   - Do not auto-scroll; keep date, scroll, zoom, selections.

4. [x] Cross-tab (same user) sync.
   - Publish `session.created` message on a user-scoped channel.
   - Listen in other tabs and update the calendar if viewing the same date.

5. [~] Tests: UI interaction and behavior.
   - Immediate visibility within 1s (current tab).
   - Filtered-out creation shows generic success toast only.
   - Cross-tab propagation updates same-date views; no auto-scroll.
   Note: Added contract-level test for BroadcastChannel payload in `src/lib/calendar-broadcast.test.ts`. UI tests can be added next.

6. [x] Update documentation.
   - Quickstart validation steps confirmed.
   - Contracts reviewed and aligned with behavior.

7. [~] TypeScript & lint pass.
   - `bun lint`; fix TS errors.
   Note: Typecheck passes. Lint has pre-existing warnings/unrelated error; no new errors from this change.

8. [x] Optional: Error handling polish.
   - Ensure create failure produces clear error toast; no ghost tiles.
