Entity: Student

- New Field: `admissionDate: DateTime? @map("admission_date") @db.Date`
- Purpose: First attendance date (date-only)
- Constraints: NULL allowed; no default

Migration: add column `admission_date DATE NULL` to `students`.

