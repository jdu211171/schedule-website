# Data Model: Day Calendar Conflict Logic

## Entities

- Lesson
  - Fields (subset relevant to feature): `classId`, `date`, `startTime`, `endTime`, `teacherId`, `studentId`, `boothId`, `status`, `isCancelled`
  - Notes: `isCancelled` determines exclusion from conflict computation.

- Day Calendar View
  - Displays lessons for a given day and computes overlap indicators.
  - Visibility of cancelled lessons controlled by the toggle; conflicts computed only on active lessons.

- Conflict (derived)
  - Definition: Time overlap among active lessons sharing a resource (booth/teacher/student) within the same day.
  - Excludes cancelled lessons entirely.

## Constraints

- Cancellation flag is authoritative for exclusion.
- Toggling cancelled lesson visibility must not change conflict outcomes.

## State Transitions

- Lesson active → cancelled: remove that lesson’s contribution to any conflicts on next render.
- Lesson cancelled → active: include in conflict computation on next render.
