# 1. **Focus on Functionality**

- Target feature additions or bug fixes.
- Avoid mixing in formatting or style changes—submit those separately.

---

# 2. **Follow Code Style**

- Match the project’s style (Next.js, TypeScript, Tailwind CSS).
- Run `bun run lint` to enforce ESLint rules before submitting.

---

# 4. **Write Clear Commits**

- Use imperative mood (e.g., "Add feature" not "Added feature").
- Link to issues if applicable (e.g., "Fixes #123").

---

# 5. **Detail Your Pull Request**

- Provide a concise title and thorough description.
- Add screenshots for UI changes and testing steps for reviewers.

---

# 6. **Keep Pull Requests Small**

- Address one issue or feature per PR.
- Split large changes into smaller, logical commits.

---

# 7. **Rebase and Sync**

- Rebase on the latest `main` branch before submitting.
- Resolve conflicts and test thoroughly.

---

# 8. **Self-Review**

- Check your code for errors or improvements.
- Test changes with `bun dev` to ensure they work.

---

# Example Workflow

1. `git checkout -b feat/my-change`
2. Make changes and run `bun run lint`
3. Commit: `git commit -m "Add my change"`
4. Rebase: `git pull --rebase origin main`
5. Push: `git push origin feat/my-change`
6. Submit a PR with a clear title, description, and testing instructions.

---

# Notes

- **Dependencies:** Only add new ones if justified, ensuring compatibility with Next.js 15.2.3, React 19, and TypeScript 5.
- **Tools:** Leverage ESLint, TypeScript, and Tailwind CSS as configured in `package.json`.

## Feature Docs

- Class Series Metadata (blueprint, APIs, UI): see `docs/class-series-metadata.md`.
