# Schedule Website Constitution

## Core Principles

### I. Minimal Changes, Maximum Results
- Favor the smallest, targeted diffs that deliver measurable value.
- Avoid refactors unless strictly necessary to meet acceptance criteria.
- Preserve existing behavior, public APIs, and types whenever possible.
- Prefer composition, configuration, or thin wrappers over edits to shared code.

### II. Core UI Components Are Stable (Do Not Modify)
- Treat components under `src/components/ui/` as read‑only core primitives.
- To adjust UI, compose these components, pass overrides via props, or create lightweight wrappers outside `src/components/ui/`.
- If a change to a core UI component is ever unavoidable, propose it first in the spec (with rationale, risks, and regression plan) before implementation.

## Additional Constraints
- Aim for minimal blast radius: localize changes to the relevant feature/module.
- Keep PRs small and scoped; align with existing patterns and naming.

## Development Workflow
- Start with the spec tasks; implement incrementally with small, testable steps.
- Document assumptions and decisions in the active spec’s `research.md`.

## Governance
- This constitution captures collaborator preferences and project norms.
- Amendments require updating this file and noting the change in the active spec.

**Version**: 1.0.0 | **Ratified**: 2025-09-20 | **Last Amended**: 2025-09-20
