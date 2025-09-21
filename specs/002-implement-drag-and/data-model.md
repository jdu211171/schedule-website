# Data Model: Class Session Lesson Card Reordering

## Entities

### ClassSession
-   **id**: string (PK)
-   ... (other fields)

### Lesson
-   **id**: string (PK)
-   **classSessionId**: string (FK to ClassSession)
-   **order**: integer
-   ... (other fields)

## Relationships
-   A `ClassSession` has many `Lessons`.
-   The `order` field on the `Lesson` model determines the display order within a `ClassSession`.

## State Transitions
-   When a user drags and drops a `Lesson` card, the `order` values for all affected `Lesson` records within that `ClassSession` are updated.
