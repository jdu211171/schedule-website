# Research — Instant day calendar update after session creation

## Decisions

- Same-user tab updates: Use same-page update pattern and propagate to other tabs for the same user. Cross-user updates are out of scope.
  - Rationale: Meets clarified acceptance while minimizing complexity.
  - Alternatives: Full real-time (server push) to all users — rejected as out of scope.

- Display timezone: Asia/Tokyo for placement and display; storage remains as-is (UTC-backed).
  - Rationale: Matches existing project convention and utilities in `src/components/admin-schedule/date.ts`.
  - Alternatives: Browser local TZ; Organization setting — rejected to remain consistent.

- Filtered-out behavior: Show generic success toast only; do not auto-adjust filters or show filter-specific hints.
  - Rationale: Simple and avoids accidental scope changes to filter UI.
  - Alternatives: Reveal action, auto-disable filters — rejected.

- Creation context: Same-page popup (modal/drawer) for class series.
  - Rationale: Aligns with existing series UI (drawers/dialogs) and avoids navigation churn.
  - Alternatives: Separate route — rejected.

- Auto-scroll: Do not auto-scroll after creation; preserve scroll/zoom.
  - Rationale: Avoids disorienting the user; consistent with preserve-state requirement.
  - Alternatives: Conditional/always scroll — rejected.

- Performance baseline: UI reflects new session within 1 second (p95) after successful creation on a typical admin device and network.
  - Rationale: Matches acceptance phrasing; provides a measurable target for validation.
  - Alternatives: Stricter budgets — defer until measured.

- Secondary summaries scope: Update summaries that are part of the day calendar page (e.g., same-view counts if present). Cross-page dashboards/metrics are out of scope.
  - Rationale: Keeps scope tied to the current view while honoring consistency.
  - Alternatives: Global refresh of unrelated pages — rejected.

- Data model: No schema changes. Reuse existing create session API; UI handles local state update.
  - Rationale: Feature is presentational refresh/sync, not data modeling.

## Notes

- Remaining minor open items are documented as deferred in the plan. None are blockers for initial implementation/testing.
