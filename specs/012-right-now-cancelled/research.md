# Research: Exclude Cancelled Lessons from Conflict Detection

## Decisions
- Cancelled definition: Use the cancellation flag (`isCancelled`/`is_cancelled` in data) to determine cancellation state. Status labels (e.g., `CONFLICTED`, `CONFIRMED`) do not imply cancellation.
- Conflict computation scope: Compute conflicts among active lessons only. Cancelled lessons must not create conflicts nor be considered as neighbors in overlap checks.
- Toggle behavior: “キャンセル授業を表示” only affects visibility (data fetch and rendering), not conflict logic.

## Rationale
- Domain alignment: `class_sessions` schema contains a boolean cancellation flag; existing docs/scripts use this for filtering conflicts.
- UX consistency: Users expect cancelled sessions to be contextual only; conflicts should highlight actionable scheduling issues among active sessions.
- Safety: UI-only change avoids backend migration and preserves current APIs.

## Alternatives Considered
- Filtering at data-fetch layer (server): Not chosen to preserve toggle flexibility and avoid changing API semantics for other screens.
- Relying on stored `status='CONFLICTED'`: Not chosen; day view already favors live overlap computation, which is more accurate in dynamic UI.

## Impact
- No backend/API changes.
- UI logic update in Day Calendar overlap detection to skip cancelled lessons.

## Performance Notes (2025-10-07)
- Overlap computation remains O(n) per session, scanning same-day sessions.
- Refactor extracted pure predicates (computeBoothOverlap/Teacher/Student) without adding additional passes.
- In local runs, rendering with test data shows no noticeable regression (<= ~5ms per render for the overlap checks on small day sets).
