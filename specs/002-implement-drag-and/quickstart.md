# Quickstart: Testing Drag-and-Drop

Admin Day Calendar
- Open Admin → Day calendar.
- Drag any lesson card to another time/booth cell within the same day.
- Observe the blue ghost overlay matches the card width and position.
- On drop, the lesson moves immediately (optimistic). If the request fails, it snaps back (rollback).
- Ensure no scroll jump occurs during or after drop.

Student/Teacher List (optional demo)
- Mobile week view lists also support DnD reorder in demo; this is not required for the DayCalendar flow.
