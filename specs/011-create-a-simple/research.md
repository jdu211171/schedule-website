# Research & Analysis for Password Change UI

## 1. Technical Stack & Dependencies
- **Decision**: Use existing project stack: Next.js, React, TypeScript, NextAuth.js v5, Prisma, and `bcryptjs` for hashing.
- **Rationale**: The project conventions are well-established. `bcryptjs` is a suitable library for password hashing and is likely already in use or can be easily added. The feature is a standard web UI, so no new dependencies are required.
- **Alternatives Considered**: None, to maintain consistency with the existing codebase.

## 2. API Endpoint Design
- **Decision**: Create a new API route at `POST /api/auth/change-password`.
- **Rationale**: Placing this under `/api/auth` is consistent with NextAuth's patterns. A `POST` request is appropriate for submitting a form that changes state. The request will be handled by a custom API route that is protected and can access the user's session.
- **Alternatives Considered**: A `PUT` request to `/api/users/[id]/password`, but this is less secure as it exposes user IDs and is less aligned with auth-specific actions.

## 3. UI Implementation & Location
- **Decision**: The UI will be a modal dialog containing a form. This dialog will be triggered by a "Change Password" link in the user menu dropdown.
- **Rationale**: This was clarified and decided upon in the previous step. A modal is a non-disruptive way to handle a simple, focused task like changing a password. It will be built using `shadcn/ui` components (`Dialog`, `Form`, `Input`, `Button`) to match the existing UI.
- **Alternatives Considered**: A dedicated settings page, but this was deemed too heavyweight for a single action as per the clarification phase.

## 4. Password Handling Logic
- **Decision**:
    - For **Admin** and **Staff** roles: The API will compare the provided `currentPassword` with the hashed password in the database using `bcrypt.compare()`. The `newPassword` will be hashed using `bcrypt.hash()` before being saved.
    - For **Teacher** and **Student** roles: The API will perform a direct string comparison for the `currentPassword` and save the `newPassword` as plaintext, as per the spec's explicit requirement.
- **Rationale**: This directly implements the logic specified in `FR-003` and `FR-004`. It requires a conditional check in the API route based on the user's role, which is available in the NextAuth session.
- **Alternatives Considered**: Hashing all passwords. This was rejected as it violates the explicit (though unusual) requirement to store Teacher/Student passwords in plaintext.

## 5. State Management
- **Decision**: Use TanStack Query's `useMutation` hook to handle the form submission.
- **Rationale**: The project already uses TanStack Query for server state. A mutation is the correct pattern for an action that modifies data on the server. It provides built-in state handling for loading, error, and success states, which can be used to give the user feedback in the UI.
- **Alternatives Considered**: Using local component state (`useState`). This is simpler but provides less robust handling of the async server request lifecycle.
