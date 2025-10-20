# Contract — Day Calendar Session Events (same-user tabs)

## Event: `session.created`

- Scope: Same authenticated user (cross-tab only)
- Channel: `admin-day-calendar`
- Delivery: Best-effort within 1s of successful creation

### Payload (JSON)

```
{
  "type": "session.created",
  "classId": "string",
  "date": "YYYY-MM-DD",
  "startTime": "HH:mm",
  "endTime": "HH:mm",
  "teacherId": "string|null",
  "studentId": "string|null",
  "boothId": "string|null",
  "status": "string|null",
  "seriesId": "string|null"
}
```

### Behavior

- Tabs on the same date update immediately if the new session matches current filters.
- If filters exclude the session, nothing renders; a generic success toast may still be shown in the creating tab.
- No auto-scroll is performed.

### Errors

- Event delivery is best-effort; creating tab is source of truth (it updates UI immediately).
