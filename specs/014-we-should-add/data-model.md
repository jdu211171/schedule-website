# Data Model: Class Type Filters

## Entities

### ClassType
- classTypeId: string (UUID)
- name: string (localized label)
- parentId: string | null
- order: number | null
- color: string | null

Relationships:
- parent: ClassType | null
- children: ClassType[]

### FilterState
- role: "ADMIN" | "STAFF" | "TEACHER" | "STUDENT"
- selectedClassTypeIds: string[]
- lastUpdated: ISO timestamp

Constraints:
- Exact match filtering on `classTypeId` only (no descendant expansion).
- Persistence key format: `filter:classTypes:{role}` in localStorage (one selection shared across branches).

### ViewVariant
- value: "DAY" | "WEEK" | "MONTH"
- appliesTo: Admin/Staff (DAY, WEEK), Teacher/Student (WEEK, MONTH)

## Validation
- `selectedClassTypeIds` values must exist in `/api/class-types` results.
- Empty `selectedClassTypeIds` means “All types”.

