# API Contract: POST /api/auth/change-password

This endpoint allows an authenticated user to change their own password.

## Endpoint

- **Method**: `POST`
- **Path**: `/api/auth/change-password`

## Authorization

- **Required**: Yes
- **Roles**: `ADMIN`, `STAFF`, `TEACHER`, `STUDENT`
- The user must be authenticated. The endpoint will use the session to identify the user.

## Request Body

The request body must be a JSON object matching the following Zod schema.

### Zod Schema (`changePasswordSchema`)

```typescript
import { z } from "zod";

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: "Current password is required." }),
  newPassword: z
    .string()
    .min(4, { message: "New password must be at least 4 characters long." }),
});
```

### Example Request

```json
{
  "currentPassword": "old-password-123",
  "newPassword": "new-password-456"
}
```

## Responses

### 200 OK - Success

Returned when the password has been successfully updated.

```json
{
  "message": "Password changed successfully."
}
```

### 400 Bad Request

Returned for validation errors (e.g., missing fields, new password too short).

```json
{
  "error": "New password must be at least 4 characters long."
}
```

### 401 Unauthorized

Returned if the user is not authenticated.

### 403 Forbidden

Returned if the `currentPassword` does not match the user's actual current password.

```json
{
  "error": "Incorrect current password."
}
```

### 500 Internal Server Error

Returned for any unexpected server-side errors.
