# Research: Exclude Cancelled Lessons from Conflict Detection

## Decisions

- Cancelled definition: Use the cancellation flag (`isCancelled`/`is_cancelled` in data) to determine cancellation state. Status labels (e.g., `CONFLICTED`, `CONFIRMED`) do not imply cancellation.
- Conflict computation scope: Compute conflicts among active lessons only. Cancelled lessons must not create conflicts nor be considered as neighbors in overlap checks.
- Toggle behavior: “キャンセル授業を表示” only affects visibility (data fetch and rendering), not conflict logic.
- Cancelled session interaction: Keep cards pointer-enabled and detect drag via an 8px pointer threshold so a quick click opens details while a drag reuses the existing range-selection flow to create replacements.

## Observation (2025-10-20)

- When range selection starts from an empty calendar cell and the pointer crosses over a cancelled lesson card, selection updates stop because the card overlays the cells and the current pointer handlers only forward movement when the drag started on the card itself.
- On mouseup over a cancelled card in this case, the global "mouseup" handler cancels the selection (since the target is not a calendar cell), and the card itself treats the interaction as a click and opens details.

## Root Cause

- In `LessonCard` the pointer bridge for cancelled cards is gated on a local `pointerStateRef` that is set only when `pointerdown` occurred on the card. When selection originates from a cell, `pointerStateRef` is null, so `onPointerMove` returns early and does not call `onCancelledDragMove`. Because the lessons overlay sits above cells, the cell `onMouseEnter` never fires while crossing the cancelled card.
- Additionally, `onPointerUp` on the cancelled card considers this a click (since no local drag was started) and opens details. Meanwhile, the DayCalendar's global `mouseup` cancels selection when the target is not a cell.

## Fix Strategy

- Bridge selection across cancelled cards regardless of where the pointer down started:
  - In `LessonCard` (cancelled only), call `onCancelledDragMove` and `onCancelledDragEnd` even when the local `pointerStateRef` is null. These calls are harmless when no selection is active because DayCalendar's handlers early-return unless `isSelecting` is true.
  - In this "external selection" path, do NOT call `preventDefault/stopPropagation` and DO NOT treat it as a click; just forward the slot index to the DayCalendar callbacks.
- Optional hardening: In DayCalendar's global `mouseup`, if selection is active and the event target is within `[data-cancelled="true"]`, resolve the slot index from pointer position and finalize instead of canceling.

## Acceptance

- Range selection started on a cell continues smoothly when pointer crosses over cancelled cards (same row only), and mouseup over a cancelled card finalizes the selection instead of opening details.
- Starting on a cancelled card still preserves the 8px threshold: click opens details; drag initiates selection.

## Rationale

- Domain alignment: `class_sessions` schema contains a boolean cancellation flag; existing docs/scripts use this for filtering conflicts.
- UX consistency: Users expect cancelled sessions to be contextual only; conflicts should highlight actionable scheduling issues among active sessions.
- Interaction clarity: Differentiating click from drag on the card maintains both inspection and quick replacement workflows without obscuring hit targets behind overlapping cards.
- Safety: UI-only change avoids backend migration and preserves current APIs.

## Alternatives Considered

- Filtering at data-fetch layer (server): Not chosen to preserve toggle flexibility and avoid changing API semantics for other screens.
- Relying on stored `status='CONFLICTED'`: Not chosen; day view already favors live overlap computation, which is more accurate in dynamic UI.
- Leaving cards transparent (pointer-events: none): Rejected because it breaks access to cancelled session details when another lesson partially covers the block.

## Impact

- No backend/API changes.
- UI logic update in Day Calendar overlap detection to skip cancelled lessons.

## Performance Notes (2025-10-07)

- Overlap computation remains O(n) per session, scanning same-day sessions.
- Refactor extracted pure predicates (computeBoothOverlap/Teacher/Student) without adding additional passes.
- In local runs, rendering with test data shows no noticeable regression (<= ~5ms per render for the overlap checks on small day sets).
