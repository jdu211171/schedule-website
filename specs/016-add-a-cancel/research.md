# Research and Decisions: Cancel From This Point (キャンセル)

**Feature**: /home/user/Development/schedule-website/specs/016-add-a-cancel/spec.md  
**Date**: 2025-10-11  
**Branch**: 016-add-a-cancel

## Unknowns → Research Tasks → Decisions

1) How to cancel “from this point” using existing APIs?
- Decision: Use POST `/api/class-sessions/cancel` with `{ seriesId, fromDate }`, where `fromDate` is the selected occurrence’s date (YYYY-MM-DD). For “single”, use `{ classIds: [classId] }`.
- Rationale: Endpoint supports seriesId + fromDate and batch via classIds. It updates `isCancelled` and recomputes neighbors.
- Alternatives considered: New combined endpoint to cancel and pause; rejected to maximize reuse and minimize backend changes.

2) How to stop future generation after cancel “from this point”?
- Decision: PATCH `/api/class-series/{seriesId}` with `{ status: "PAUSED" }` after successful cancel-from.
- Rationale: Advance generation cron explicitly includes only ACTIVE series; PAUSED excludes series from generation.
- Alternatives considered: Set endDate to the previous occurrence; rejected due to higher migration risk and copy ambiguity.

3) Where to integrate UI affordance in 授業の編集?
- Decision: Add a キャンセル button in edit mode next to 削除; when recurring, show a radio group mirroring delete (single vs series). Reuse existing `ConfirmDeleteDialog` for confirmation and copy.
- Rationale: Maintains established patterns used by 削除; reduces cognitive load and code surface area.
- Alternatives considered: Keep cancel only in view mode; rejected per requirement to match delete scope affordances.

4) Notification behavior?
- Decision: Mirror delete notifications for cancellations (same audience, channels, timing).
- Rationale: Aligns with spec decision and existing user expectations; avoids fragmentation in comms.
- Alternatives considered: Custom cancellation copy/channels; can be added later if needed.

5) Idempotency and error handling?
- Decision: Rely on cancel route safeguards (`isCancelled: false` in updateMany). UI: show success/toast messages and no-op gracefully when nothing changes.
- Rationale: Endpoint prevents bumping timestamps for pre-cancelled items; minimizes race side-effects.
- Alternatives considered: Client-side filtering before request; unnecessary duplication.

## Implementation Notes (to inform design)

- Source components to change: `src/components/admin-schedule/DayCalendar/lesson-dialog.tsx` (add cancel radiogroup in edit mode; state like `cancelMode` + `showCancelConfirm`).
- Hooks to reuse: `useClassSessionCancel` for both single and series cancellation; `useUpdateClassSeries` to set `status: "PAUSED"`.
- API routes to reuse: `POST /api/class-sessions/cancel`, `PATCH /api/class-series/{seriesId}`.
- Boundary derivation: use the selected lesson’s date (format YYYY-MM-DD) for `fromDate`.
- Permissions: Same as delete flows; API already enforces via `withBranchAccess`.
- Copy: Buttons 「キャンセル」「この授業のみキャンセル」「この回以降をキャンセル」; confirmation 「この操作は元に戻せません。よろしいですか？」.

## Risks and Mitigations

- Risk: Partial cancel succeeds but PAUSE fails.
  - Mitigation: Chain operations; on PAUSE failure, show error and advise retry; sessions remain canceled so side-effects are acceptable.
- Risk: Cancel called on last occurrence with no future sessions.
  - Mitigation: Still set PAUSED; show success with message that only current was canceled.
- Risk: Race with concurrent edits.
  - Mitigation: Server idempotency; client toasts and background invalidation via React Query.

