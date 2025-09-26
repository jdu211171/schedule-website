# Auto Self Status Recompute After Edit

Problem
- When resolving a conflict by editing a session (time/teacher/booth) from the calendar or the series dialog, the session’s stored `status` remains `CONFLICTED` until staff click 「確認」. This adds friction when hard overlaps have been cleared by the edit itself.

Goal
- After a successful edit (PATCH) of a class session, recompute that session’s own status server‑side and persist it. If policy concludes it is now clear, set `status='CONFIRMED'` automatically, reducing the need to press 「確認」.

Out of Scope
- Do not override policy for soft availability conflicts. The explicit 「確認」 endpoint remains the override to accept soft warnings (and is still blocked by hard conflicts).

Acceptance Criteria
- PATCH `/api/class-sessions/[classId]`: when an edit changes date/time/teacher/student/booth, the updated session’s status is recomputed and saved.
- If no hard overlaps exist and branch policy does not elevate soft mismatches, the session flips to `CONFIRMED` automatically.
- Neighbor sessions still recompute as before.
- PATCH `/api/class-sessions/series/[seriesId]`: each updated instance also recomputes its own status post‑transaction.
- No change to confirm API behavior.

Risks / Notes
- Leave behavior unchanged for branches that intentionally mark soft conflicts as `CONFLICTED`.
- Self‑recompute is non‑blocking; do not fail the main update on errors.

