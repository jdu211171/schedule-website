# Spec: Add Student Admission Date

- ID: 005-student-admission-date
- Owner: engineering
- Goal: Store the date a student started attending (admission date) with minimal impact.

## Acceptance Criteria
- Prisma Student model exposes `admissionDate` mapped to `admission_date DATE`.
- Migrations created and Prisma client generated.
- Zod schemas accept optional `admissionDate` on create/update/import.
- API responses include `admissionDate`.
- CSV import/export supports `入会日`.
- Documentation updated.

## Out of Scope
- UI changes to capture/display this field.
