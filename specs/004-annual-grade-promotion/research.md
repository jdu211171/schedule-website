# Research / Notes

Assumptions
- `order` increases as students progress (e.g., 小学生(1) → 中学生(2) → 高校生(3) → 大人(4)).
- Types beyond a certain point have `max_years IS NULL` (non-graded) and are end-states.
- Some students may have missing `student_type_id` or `grade_year`; the job ignores them.

Open Questions
- Should timezone for the April check use business TZ (e.g., Asia/Tokyo)? For now, UTC.
- Should we log a yearly run to enforce idempotency if manually executed? Not required now.

Validation Ideas
- Create sample rows for a student at grade < max, exactly max, and in a non-graded type; run the function and assert expected changes.

Findings (Sep 22, 2025)
- Initial implementation incremented within-type before cross-type promotion, causing grade 5 (小学生) to increment to 6 and then be promoted to 中学生(1) in the same run. Fixed by:
  - Promoting cross-type first and tracking moved IDs in a temp table.
  - Excluding moved IDs from the subsequent within-type increment.
  - Validation queries now show correct transitions: 小6→中1 occurs; 小5 stays in 小6; 高3 does not move (next ungraded).

Update per stakeholder clarification
- Desired behavior: when the last graded type hits max (e.g., 高校生3), move into the next type even if it is ungraded (e.g., 浪人生), set grade_year = NULL, and stop future promotions. Implemented by allowing cross-type promotion regardless of `next.max_years` and setting grade to NULL when the next type is ungraded.
