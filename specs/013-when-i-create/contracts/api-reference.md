# Contract — Session Creation API (reference)

No new endpoints are introduced. This feature relies on the existing creation endpoint.

## POST `/api/class-sessions`

- Purpose: Create a regular class session
- Request: JSON body with date, startTime, endTime, and associations (teacher, student, subject, classType, booth, etc.)
- Response: 200 OK with created session payload including `classId`, `date`, `startTime`, `endTime`, `status`, and associations.

### Notes

- On success, the creating tab updates the day calendar immediately and emits `session.created` for same-user tabs.
- On failure, no UI insertion occurs; show error toast.
