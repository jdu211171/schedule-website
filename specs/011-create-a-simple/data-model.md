# Data Model: Password Change

This feature primarily interacts with the existing `User` entity. No new models are required.

## User Entity

Represents an individual with access to the system. The password change logic will read and update fields on this model.

- **Source**: `prisma/schema.prisma`
- **Model**: `User`

### Relevant Fields

| Field | Type | Description | Notes |
|---|---|---|---|
| `id` | `String` | Unique identifier for the user. | `@id @default(cuid())` |
| `password` | `String?` | The user's password. Hashed for Admin/Staff, plaintext for others. | Optional field. |
| `role` | `UserRole` | The user's role in the system. | Enum: `ADMIN`, `STAFF`, `TEACHER`, `STUDENT`. |

### State Transitions

The `password` field is the only one that changes. The value is updated upon successful completion of the password change flow. The logic is conditional based on the `role` field.
