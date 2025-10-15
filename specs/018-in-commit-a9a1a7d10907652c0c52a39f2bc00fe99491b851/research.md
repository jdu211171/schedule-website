# Research: Global Class Type Filter Visibility (Admin-Controlled)

## Background
- Prior change (commit a9a1a7d1) introduced per-user class type filter visibility (filters-only).
- New requirement: replace per-user visibility with a single global setting configurable only by Admins.
- UI change: remove 表示管理 (per-user visibility UI). Add per-row toggle in マスターデータ管理 > 授業タイプ.

## Goals
- One global boolean `visibleInFilters` on ClassType controls presence in filter lists for ALL users (students, teachers, staff).
- Filters-only scope; do not hide calendar/content items based on this flag.
- Default ON for existing and new class types; backfill existing to true.
- Drop per-user visibility schema via migration; remove related code paths.
- Include `visibleInFilters` in CSV import/export for class types.

## Existing Patterns to Reuse
- Masterdata (マスターデータ管理) table row toggle patterns (UI components, server actions/API handlers, mutations, optimistic updates where applicable).
- Role-based authorization patterns for Admin-only actions (UI gating + server-side enforcement).
- CSV import/export conventions (boolean mapping, header localization/labels).
- Prisma migration patterns and DB boolean defaults.

## Key Decisions (from Clarifications)
- Roles allowed to toggle: Admins only.
- Default state: ON for existing and new class types.
- Scope: Filters-only; no content hiding.
- Legacy data: Drop per-user visibility schema via migration.
- CSV: Include in both import and export.

## Risks & Mitigations
- Risk: Mixed-mode behavior during rollout. Mitigation: Apply DB migration first and remove old code paths in same release.
- Risk: Users confused by missing 表示管理. Mitigation: Ensure UI copy and admin toggle are discoverable; optional tooltip.
- Risk: Missing authorization on API. Mitigation: Enforce Admin-only check both client and server.

## Open Items (Low risk / to handle in implementation)
- Exact component names and route paths in admin masterdata area.
- Confirm if an existing update endpoint covers class type updates; otherwise add specific handler for the toggle.

