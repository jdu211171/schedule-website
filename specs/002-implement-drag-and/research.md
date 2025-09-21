# Research: Drag-and-Drop Functionality

## Concurrent Edits

*   **Decision**: Last-write-wins. The latest update will overwrite any previous updates.
*   **Rationale**: The user story focuses on a single user adjusting the schedule. Implementing a more complex concurrency control mechanism (like locking or merging) is overkill for this feature and violates the "minimal code changes" constraint. The risk of two users reordering the exact same list at the exact same time is low.
*   **Alternatives considered**:
    *   **Locking**: Prevent a user from editing a list if another user is already editing it. This would add significant complexity to the UI and backend.
    *   **Real-time updates**: Use websockets to push changes to all clients in real-time. This is a major architectural change and out of scope.
