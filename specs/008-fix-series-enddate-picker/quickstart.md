# Quickstart / Verification

1. Go to ダッシュボード → スケジュール → シリーズ タブ
2. In the table, click the end date trigger button (calendar icon) in any row.
3. Select a date:
   - Verify that the displayed value in the table does not change yet.
4. Click キャンセル or the X in the popover header:
   - Verify endDate remains unchanged.
5. Reopen and click クリア, then 適用:
   - Verify endDate is set to null (cleared) and popover closes.
6. Reopen, pick a date earlier than startDate, click 適用:
   - Verify validation error toast appears and no update occurs.
7. Pick a valid date and click 適用:
   - Verify the table updates to the new date and popover closes.
