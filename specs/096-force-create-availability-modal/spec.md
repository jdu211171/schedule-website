Title: Force-Create Modal for Availability Conflicts

Problem
- When creating a class session and either the teacher or student has no available time set (soft availability conflicts), the UI shows a modal asking whether to display availability errors.
- Staff/admin ultimately either force-create or cancel/skip. Surfacing the error list first costs time without changing the final decision.

Goals
- Replace the availability error prompt with two options: 強制作成 (force create) or キャンセル.
- Keep existing conflict behavior for hard overlaps (teacher/student/booth). Only pre-decide availability conflicts.
- Avoid regressions in recurring (series) and single-session flows.

Acceptance Criteria
- When soft availability conflicts are detected, the modal offers only 強制作成 and キャンセル.
- 強制作成 proceeds without showing availability errors. Hard conflicts still surface as usual.
- Single-session create succeeds if only availability conflicts existed (session is created) and still blocks on hard overlaps.
- Series flow generates sessions immediately when only availability conflicts exist; if hard conflicts remain, the conflict resolution table is shown.

