# Feature Specification: Cancel Class Sessions From This Point (キャンセル)

**Feature Branch**: `016-add-a-cancel`  
**Created**: 2025-10-11  
**Status**: Draft  
**Input**: User description: "Add a cancel all class sessions from this point functionity with キャンセル button in the 授業の編集 modal next to 削除 button この授業のみ編集 and この回以降を編集 same way as 削除 do and similar to delete all class sessions from this point. Instead of setting the class series status to DELETED, it sets the status to PAUSED, and the class series stops generating new sessions. Reference existing logic and code patterns to implement this consistently."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cancel this and future sessions (Priority: P1)

As an admin/staff scheduling manager, I open 授業の編集 for a specific occurrence and click キャンセル, choosing この回以降をキャンセル. The system cancels the selected occurrence and all future occurrences and pauses the class series so no new sessions are generated.

**Why this priority**: This addresses the primary need to stop a series from continuing and to cleanly cancel remaining occurrences with minimal steps.

**Independent Test**: From an active recurring series with future sessions, choose キャンセル → この回以降をキャンセル; verify current+future occurrences are canceled and the series status is PAUSED; verify no new sessions are generated thereafter.

**Acceptance Scenarios**:

1. Given a recurring active class series with future sessions, When I select キャンセル → この回以降をキャンセル on a mid-series occurrence, Then the selected occurrence and all future occurrences change to Canceled and the series status changes to PAUSED.
2. Given a series that is PAUSED after cancellation, When background scheduling/generation runs, Then no new sessions are created for that series beyond the cancellation point.
3. Given learners/teachers are associated to future occurrences, When those are canceled via この回以降をキャンセル, Then stakeholders are informed mirroring the existing delete notification policy (same audience, channels, timing).

---

### User Story 2 - Cancel only this occurrence (Priority: P2)

As an admin/staff scheduling manager, I need to cancel a single occurrence without stopping the series. I click キャンセル and choose この授業のみキャンセル.

**Why this priority**: Common operational need (e.g., one-off holiday or teacher absence) without impacting the ongoing series.

**Independent Test**: From an active recurring series, choose キャンセル → この授業のみキャンセル on one occurrence; verify only that session is canceled and the series remains active (continues generating future sessions as scheduled).

**Acceptance Scenarios**:

1. Given an active class series with future sessions, When I select キャンセル → この授業のみキャンセル on a single occurrence, Then only that occurrence becomes Canceled and the series status remains unchanged (not paused).

---

### User Story 3 - Safety, idempotency, and states (Priority: P3)

As a scheduler, I should not be able to re-cancel already canceled/deleted occurrences, and the UI should guide me safely for edge states (e.g., last occurrence, already-paused series).

**Why this priority**: Prevents user errors, double actions, and ensures consistent data.

**Independent Test**: Attempt to cancel an already canceled occurrence; attempt この回以降をキャンセル when there are no future sessions; cancel on the last occurrence.

**Acceptance Scenarios**:

1. Given an occurrence already in Canceled or Deleted state, When I open 授業の編集, Then the キャンセル action is disabled or results in a no-op with a clear message.
2. Given a series with no future generated sessions, When I choose この回以降をキャンセル, Then the selected occurrence is canceled and the series is set to PAUSED; no errors occur.
3. Given a series already in PAUSED status, When I choose この回以降をキャンセル, Then all remaining future generated sessions (if any) from that point are canceled; the series stays PAUSED.

### Edge Cases

- Cancel from the last remaining occurrence in the series (should cancel that occurrence and set series to PAUSED when choosing この回以降をキャンセル).
- Cancel from a past occurrence: action should still allow この回以降をキャンセル to affect future occurrences only; past states remain unchanged.
- Attempting to cancel when permissions do not allow delete/cancel (should be hidden/disabled based on same permission model as 削除).
- Multiple schedulers acting concurrently on the same series/occurrence (must ensure idempotency and consistent end-state).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The 授業の編集 modal MUST include a キャンセル action next to 削除, mirroring scope options: この授業のみキャンセル and この回以降をキャンセル.
- **FR-002**: Selecting この授業のみキャンセル MUST set only the selected occurrence’s state to Canceled without changing the series status.
- **FR-003**: Selecting この回以降をキャンセル MUST set the selected occurrence and all future occurrences in the series to Canceled and MUST set the class series status to PAUSED so no new sessions are generated thereafter.
  - Boundary selection MUST match 削除: the selected occurrence’s date is the inclusive pivot for “この回以降”.
  - Series blueprint update MUST mirror 削除: set ClassSeries `endDate` to the inclusive pivot date and ensure `lastGeneratedThrough` is at least the pivot; this prevents regeneration beyond the pivot unless users explicitly extend/resume.
- **FR-004**: The system MUST stop generating any new sessions for a PAUSED class series until explicitly resumed by users via existing series controls.
- **FR-005**: The cancel flow MUST use the same confirmation pattern, permission checks, and guardrails as 削除, with text and semantics adapted for cancellation.
- **FR-006**: The UI MUST clearly label and localize the options as キャンセル, この授業のみキャンセル, and この回以降をキャンセル, placing them consistently alongside existing 削除 controls.
- **FR-007**: The system MUST handle idempotency: re-invoking cancel on already canceled targets MUST not create duplicate effects or errors.
- **FR-008**: The system MUST ensure auditability: store who performed the cancellation, when, and the scope (single occurrence vs from this point).
- **FR-009**: The system MUST preserve historical visibility: canceled occurrences remain visible with an appropriate status indicator.
- **FR-010**: The cancel operation SHOULD complete promptly for typical series sizes (e.g., under 30 seconds for series with up to several hundred future occurrences) to maintain user flow.
- **FR-011**: Permissions for キャンセル MUST match those for 削除 on the same object types; users without permission MUST not see or be able to invoke cancellation.
- **FR-012**: After この回以降をキャンセル, background processes MUST NOT create any additional sessions for that series unless the series is resumed (i.e., taken out of PAUSED).
- **FR-013**: Error states MUST surface clear, non-technical messages guiding the user to safe outcomes (e.g., if nothing to cancel, confirm series will be paused).

Clarified items:

- **FR-020**: Cancellation notifications: The system MUST notify affected students/teachers on cancellation by mirroring existing delete notifications (same audience, channels, and timing).
- **FR-021**: Confirmation text and final copy: Use the following labels and default confirmation text:
  - Primary action label: 「キャンセル」
  - Scope options: 「この授業のみキャンセル」, 「この回以降をキャンセル」
  - Confirmation dialog text: 「この操作は元に戻せません。よろしいですか？」

Notes/Assumptions for interpretation and testing:

- “この回以降” includes the selected occurrence itself and all future occurrences in the series.
- Choosing この授業のみキャンセル does not pause the series and does not affect future occurrences.
- Permissions and side-effects (e.g., conflict recomputations, downstream hooks) follow the same pattern as 削除.

### Key Entities *(include if feature involves data)*

- **ClassSeries**: Represents a recurring class. Key attributes: status (e.g., ACTIVE, PAUSED, ENDED), recurrence settings, ownership.
- **ClassSession (Occurrence)**: Represents a single scheduled occurrence. Key attributes: status (e.g., SCHEDULED, CANCELED, COMPLETED, DELETED), start/end time, assigned teacher/room.
- **User (Scheduler/Admin/Staff)**: Actor able to initiate cancellation following the same permission constraints as 削除.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the cancellation flow (any option) in under 30 seconds end-to-end 95% of the time.
- **SC-002**: For series canceled “from this point,” 100% of targeted current+future occurrences reflect Canceled state within the same day, and no new sessions are generated thereafter until resumed.
- **SC-003**: 0% of canceled series generate additional sessions during the PAUSED period (measured over a 7-day window).
- **SC-004**: At least 90% of scheduling users rate the clarity of the cancellation options and outcomes as “clear” in internal QA/acceptance surveys.

## Clarifications

### Session 2025-10-11

- Q: What is the boundary for “この回以降をキャンセル”？ → A: Use the selected occurrence’s date (inclusive), aligned with 削除.
- Q: When cancelling “この回以降”, should the series blueprint be shortened like 削除? → A: Yes. Set `endDate` to the inclusive pivot date and clamp `lastGeneratedThrough` ≥ pivot; also set series `status` to `PAUSED`.
