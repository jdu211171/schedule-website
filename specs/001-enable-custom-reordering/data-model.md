# Data Model for Custom Column Ordering

## Database Schema Changes

No changes are required to the database schema for this feature. The custom column order is a user-specific view preference and will be stored on the client-side in `localStorage`.

## Client-Side Data Structure

The column order will be stored in `localStorage` as a JSON object. The key will be a unique identifier for the table (e.g., `teacher-table-column-order`), and the value will be an array of strings, where each string is the ID of a column.

\*+Example:\*\*

```json
{
  "teacher-table-column-order": ["name", "email", "phone", "status"],
  "student-table-column-order": ["name", "grade", "email", "status"]
}
```
