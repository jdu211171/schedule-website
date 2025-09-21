# Plan: Add Username/Password Generators

- Add inline generator buttons for username and password in both dialogs.
- Keep logic local to components to minimize churn and avoid wider imports.
- Username format: 3 letters + 3 digits; exclude l, o, 0, 1.
- Password: 12 chars, mix of lower/upper/digits/symbols, exclude ambiguous.
- Update only `student-form-dialog.tsx` and `teacher-form-dialog.tsx`.
- Verify typecheck via `bun run check-errors`.

