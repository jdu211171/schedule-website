# Quickstart: Cancel From This Point (キャンセル)

Feature: /home/user/Development/schedule-website/specs/016-add-a-cancel/spec.md

## Goal

Enable cancellation from an occurrence forward and pause the series so no new sessions generate.

## Steps to Demo

1. Open schedules and select an occurrence that belongs to a recurring series.
2. Open 授業の編集 (LessonDialog) in edit mode.
3. Click 「キャンセル」 next to 「削除」.
4. Choose scope:
   - 「この授業のみキャンセル」: only the current occurrence is canceled.
   - 「この回以降をキャンセル」: the current and all future occurrences are canceled; the series is paused.
5. Confirm the dialog.
6. Verify results:
   - Current (and future) occurrences show 「キャンセル」 status badges in lists.
   - In シリーズ詳細, status shows 「PAUSED」.
   - Advance generation (if triggered) does not create new sessions for the paused series.

## Validation Tips

- For series pause, check Series Detail or run a read via API to confirm `status: PAUSED`.
- To verify no new sessions generate, trigger the extend/preview UI and ensure no items appear beyond the boundary.
- Permissions: login as ADMIN/STAFF; ensure operations are disabled/hidden otherwise.

### Notifications Parity Check (FR-020)

- Verify cancellations mirror delete notifications behavior (audience, channels, timing).
- If delete currently does not notify, cancellation should also remain silent (parity).
- If delete does notify, ensure cancellation creates equivalent notifications via the existing notification pipeline.

### Performance Check (≤ 30s)

- Prepare a recurring series with several hundred future sessions.
- In LessonDialog, choose 「キャンセル → この回以降をキャンセル」 and start a timer.
- Stop the timer after the confirmation success toast.
- Expected: ≤ 30 seconds end-to-end in typical conditions. Record the result below.

Results log:
- Date: ____  Elapsed: ____

## Rollback

- For a cancelled single occurrence: use 「再開」 button in LessonDialog (view mode).
- For a paused series: set status back to ACTIVE from シリーズ詳細 and/or resume as per existing controls.
