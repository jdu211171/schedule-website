# Research: Drag-and-Drop Functionality

## Concurrent Edits

*   **Decision**: Last-write-wins. The latest update will overwrite any previous updates.
*   **Rationale**: The user story focuses on a single user adjusting the schedule. Implementing a more complex concurrency control mechanism (like locking or merging) is overkill for this feature and violates the "minimal code changes" constraint. The risk of two users reordering the exact same list at the exact same time is low.
*   **Alternatives considered**:
    *   **Locking**: Prevent a user from editing a list if another user is already editing it. This would add significant complexity to the UI and backend.
    *   **Real-time updates**: Use websockets to push changes to all clients in real-time. This is a major architectural change and out of scope.

## Data Model Alignment Notes

Decision: Implement API contract as a validated no-op for now. 

Rationale: The current Prisma schema has no `Lesson` model under `ClassSession`, nor an `order` field on `ClassSession` that could store display ordering. To unblock UI work and keep changes minimal, the reorder endpoint validates input and returns 200 so optimistic UI flows can proceed without breaking. Persistence will be wired once an appropriate storage strategy (e.g., `Lesson` entity or order override) is introduced.

Alternatives considered:
- Add `order` column to `ClassSession` and scope order by day/series — deferred to avoid unintended side-effects on scheduling logic.
- Add a new `class_session_order_overrides` table keyed by context (e.g., date/teacher) — deferred pending product decision.
