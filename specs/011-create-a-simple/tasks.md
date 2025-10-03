# Implementation Tasks: Password Change UI

This plan breaks down the work into sequential and parallelizable tasks. Follow the TDD (Test-Driven Development) principle where applicable.

## Phase 1: Backend API

### Backend Setup

- [x] 1. **[Schema]** Define/update the Zod schema for the change password request body in `src/schemas/password.schema.ts`. The schema validates `currentPassword`, `newPassword` (min 4), and `confirmPassword`.
- [x] 2. **[Dependency]** `bcryptjs` is already a dependency.

### API Route Implementation

- [x] 3. **[API]** Implement role-scoped routes aligning with existing patterns:
  - `PATCH src/app/api/admins/me/password/route.ts` (hashed)
  - `PATCH src/app/api/staffs/me/password/route.ts` (hashed)
  - Reuse existing `teachers/students` routes (plaintext)
- [x] 4. **[API]** Each handler validates session and body, fetches user, verifies current password (role-conditional), and updates password accordingly with appropriate errors.

## Phase 2: Frontend UI & State

### State Management Hook

- [x] 10. **[Frontend] [P]** Add `src/hooks/usePasswordChange.ts` using TanStack Query and `fetcher`, routing to role-specific endpoints.

### Form Component

- [x] 11. **[Frontend] [P]** Create the `PasswordChangeForm` component in `src/components/auth/password-change-form.tsx`.
- [x] 12. **[Frontend]** Build the form UI using `shadcn/ui` components with fields for `currentPassword`, `newPassword`, and `confirmPassword`.
- [x] 13. **[Frontend]** Integrate `react-hook-form` and the Zod schema for client-side validation.
- [x] 14. **[Frontend]** Wire the form's `onSubmit` handler to the `usePasswordChange` hook.
- [x] 15. **[Frontend]** Add loading state and toasts via `sonner`.

## Phase 3: Integration & Finalization

### Dialog and Menu Integration

- [x] 16. **[Integration]** Add "パスワード変更" entry in `src/components/user-profile-menu.tsx` that opens a Dialog with `PasswordChangeForm`.

### Testing & Review

- [ ] 19. **[Testing]** Manually test the end-to-end flow for all four user roles (Admin, Staff, Teacher, Student) to verify correct behavior.
- [ ] 20. **[Review]** Create a Pull Request, review the code for adherence to project standards, and merge upon approval.
