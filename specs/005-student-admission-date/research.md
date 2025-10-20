Questions/Notes:

- Chose DATE column via `@db.Date` to store date-only.
- Kept nullable for backward compatibility.
- UI capture/display deferred per scope.

Assumptions:

- Consumers tolerate `null` when not provided.
- No derived values depend on admission date yet.
