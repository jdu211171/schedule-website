# Research for Conflicting Class Session Resolution

## Performance Goals

- **Question:** What are the expected performance goals for the conflict resolution feature? (e.g., response time for conflict detection, UI rendering speed)

## Constraints

- **Question:** Are there any specific constraints for this feature? (e.g., memory usage, browser compatibility)

## Scale/Scope

- **Question:** What is the expected scale of usage for this feature? (e.g., number of concurrent users, number of class sessions)

---

## 2025-09-25 — Incidental Bug Investigation (Series PATCH 500)

- Symptom: PATCH `/api/class-series/:seriesId` returned 500 with Prisma `P2025` (update record not found).
- Root cause: The `class_series` blueprint row for `seriesId` did not exist, while `class_sessions` contained sessions referencing that `series_id`. This can happen after deleting a series blueprint (we keep sessions) or if sessions were created without a corresponding blueprint.
- Evidence:
  - DB check via psql:
    - `SELECT series_id FROM class_series WHERE series_id='d3ca17be-89eb-430e-a580-a79fa7e7ff69';` → 0 rows
    - `SELECT DISTINCT series_id FROM class_sessions WHERE series_id='d3ca17be-89eb-430e-a580-a79fa7e7ff69';` → 1 row
- Fix: Add existence + branch-permission guard in `src/app/api/class-series/[seriesId]/route.ts` PATCH to return 404/403 before `update()`.
- Rationale: Align PATCH behavior with GET/DELETE which already 404 when missing; prevents 500 and gives clear client feedback.
