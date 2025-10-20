# Quickstart: Implementing the Password Change UI

This guide outlines the essential steps to implement the password change feature based on the provided design artifacts.

## 1. Backend: API Route

- **File**: `src/app/api/auth/change-password/route.ts`
- **Action**: Create a new `POST` handler.
- **Logic**:
  1.  Verify the user is authenticated by getting the session from NextAuth.
  2.  Validate the request body using the `changePasswordSchema` from `src/schemas/auth.ts` (you will create this schema).
  3.  Fetch the user from the database using the ID from the session.
  4.  Check the user's role (`ADMIN`, `STAFF`, `TEACHER`, `STUDENT`).
  5.  **Conditional Password Verification**:
      - If `ADMIN` or `STAFF`, use `bcrypt.compare()` to check `currentPassword` against the hashed password.
      - If `TEACHER` or `STUDENT`, use direct string comparison (`===`).
  6.  If verification fails, return a 403 error.
  7.  **Conditional Password Update**:
      - If `ADMIN` or `STAFF`, hash the `newPassword` with `bcrypt.hash()`.
      - If `TEACHER` or `STUDENT`, use the `newPassword` as plaintext.
  8.  Update the user in the database with the new password value using `prisma.user.update()`.
  9.  Return a 200 success response.

## 2. Frontend: UI Component & State

### a. Create the Form Component

- **File**: `src/components/auth/password-change-form.tsx`
- **Action**: Create a new React component.
- **UI**:
  - Use `shadcn/ui` components: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `Form`, `FormField`, `Input`, `Button`.
  - The form should have two fields: `currentPassword` (type `password`) and `newPassword` (type `password`).
  - Use `react-hook-form` with a `zodResolver` pointing to the `changePasswordSchema` for client-side validation.

### b. Implement State Management

- **File**: `src/hooks/use-auth-mutations.ts` (or similar)
- **Action**: Create a new `useMutation` hook for changing the password.
- **Logic**:
  - Use TanStack Query's `useMutation` to call the `POST /api/auth/change-password` endpoint.
  - In the `PasswordChangeForm` component, call this mutation `onSubmit`.
  - Use the mutation's `isPending`, `isError`, and `isSuccess` states to provide feedback to the user (e.g., disable the button while pending, show a success/error toast message).

## 3. Integration: User Menu

- **File**: `src/components/layout/user-nav.tsx` (or the component that renders the user menu dropdown).
- **Action**: Add a `<PasswordChangeDialog />` component.
- **Logic**:
  - The `PasswordChangeDialog` will wrap the `PasswordChangeForm` and control the open/closed state of the `Dialog`.
  - Add a `<DropdownMenuItem>` with the text "Change Password" that, when clicked, opens the dialog.
