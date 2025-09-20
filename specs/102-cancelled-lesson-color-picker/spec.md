# Cancelled Lesson Color Picker

## Problem
Admins and staff want to freely choose the color used to render cancelled class sessions in the Admin Day Calendar, instead of fixed grayscale.

## Goals
- Let ADMIN/STAFF pick a HEX color for cancelled lessons.
- Persist per-user choice (localStorage) to avoid schema/API changes.
- Apply immediately across all cancelled lesson cards without reload.
- Keep changes minimal and isolated to the Admin Day Calendar and Lesson Card rendering.

## Acceptance Criteria
- A color input appears next to the “キャンセル授業を表示” toggle.
- Picking a color updates all cancelled cards instantly.
- Choice persists on refresh (per browser/user).
- Default color is Tailwind red-500 (#ef4444) with subtle background/border.
- No changes to non-cancelled sessions.

