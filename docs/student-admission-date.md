# Student Admission Date

Adds an optional `admissionDate` field to the Student model to store the date a student started attending the learning center.

- Database: `students.admission_date DATE NULL`
- Prisma: `admissionDate DateTime? @map("admission_date") @db.Date`
- API: Included in student GET/POST/PATCH responses as `admissionDate` (ISO date)
- Validation: Accepted on create/update (optional). CSV import/export supported via header `入会日`.

Notes:
- Field is nullable for backward compatibility; existing records remain unchanged.
- If omitted in create/update/import, it stays `null`.

Example payload snippet:

```
{
  "name": "Yamada Taro",
  "username": "yamada.t",
  "admissionDate": "2024-04-10"
}
```
