ENVIRONMENT CONTEXT
We use Bun for package management. Command suggestions and installation examples should use Bun.

MODIFICATION SCOPE
Modify only the parts of the code directly related to the request.

PRESERVATION
Preserve all formatting and original names. Retain comments, annotations and documentation verbatim unless explicitly requested otherwise.

ERROR HANDLING
After making modifications, run bun run check-errors to check for TypeScript errors and fix any issues before finalizing the code output. Additional error‑checking steps are not required.

AI CODING ASSISTANT GUIDELINES

GENERIC GUIDELINES FOR ALL PROJECTS

Project management

TODO.md as development log

1. Maintain TODO.md as the central development log and task tracker.
2. Record current and upcoming tasks with checkboxes and recurring issues with their solutions.
3. Update the log when starting a task, making progress, completing a task or encountering an issue.
4. Review TODO.md at the start of each session.

Session start checklist

1. Open docs/TODO.md to review the current state and development log.
2. Run git status to view uncommitted changes.
3. Execute code‑tracking commands (see Maintenance section).
4. Review recent commits with git log --oneline -5.

Git usage for a solo developer

1. Create a git repository for each project and include a .gitignore file.
2. Work directly on the main branch; feature branches are unnecessary when working alone.
3. Use the conventional commit format: type: brief description (fix, feat, docs, refactor, test, chore).
4. Before committing, run lint and build checks and verify functionality.
5. Keep the main branch stable and deployable.
6. Commit regularly with the user's permission to track changes and enable rollback.

Development workflow

Planning and implementation

1. Discuss the approach and evaluate pros and cons before coding.
2. Make small, testable incremental changes.
3. Eliminate code duplication proactively.
4. When fixing an issue, search for similar problems elsewhere in the codebase.
5. Document recurring issues in TODO.md.

Code quality standards

1. Handle errors properly and validate inputs.
2. Follow established code conventions and patterns.
3. Never expose secrets or keys.
4. Write self‑documenting, type‑safe code.

Debugging and logging

1. Remove console.log statements before committing.
2. Clean up all debug output before production.

Folder structure documentation

1. Specify where components live.
2. Describe API route organization.
3. Note utility function locations.
4. Outline type definition structure.
5. Explain asset management.

DEVELOPMENT STANDARDS
When writing code, adhere to the following principles:

1. Prioritize simplicity and readability over clever solutions.
2. Start with minimal functionality and verify it works before adding complexity.
3. Maintain a consistent style for indentation, naming and patterns throughout the codebase.
