# Plan: Add Username/Password Generators + Eye Toggle

- Provide a single 自動生成 button next to username that fills both username and password.
- Remove separate generators from password and username-only flows.
- Add password show/hide eye toggle in both dialogs (inside the input area).
- Keep logic local to components to minimize churn and avoid wider imports.
- Username format: 3 letters + 3 digits; exclude l, o, 0, 1.
- Password: use same 6-char safe charset (letters+digits) to match schema minimum; generated identical to username.
- Update only `student-form-dialog.tsx` and `teacher-form-dialog.tsx`.
- Verify typecheck via `bun run check-errors`.
