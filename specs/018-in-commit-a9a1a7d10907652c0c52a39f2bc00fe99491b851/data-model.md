# Data Model: Global Class Type Filter Visibility

## Entities

### ClassType

- id: string (UUID or existing type)
- name: string
- ... (existing attributes unchanged)
- visibleInFilters: boolean (default: true)

Constraints/Rules:

- visibleInFilters defaults to true at DB level.
- Backfill migration sets existing rows to true.
- Removing per-user visibility schema: drop related tables/columns/indexes introduced in per-user visibility feature.

## Relationships

- No new relationships introduced.

## Migrations

- Add `visibleInFilters boolean NOT NULL DEFAULT true` to ClassType table.
- Drop per-user visibility schema artifacts.
- Ensure no dependent views/triggers/functions rely on the old per-user schema.

## CSV Import/Export

- Include `visibleInFilters` column.
- Boolean mapping follows existing convention (e.g., true/false or Y/N per current masterdata CSV rules).
