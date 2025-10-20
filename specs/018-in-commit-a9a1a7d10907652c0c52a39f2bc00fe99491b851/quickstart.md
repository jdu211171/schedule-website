# Quickstart: Global Class Type Filter Visibility

## Prerequisites

- Bun installed
- Local Postgres running (see project README)
- .env configured (DATABASE_URL, DIRECT_URL)

## Setup

1. Install deps: `bun install`
2. Generate Prisma client: `bun postinstall` (or `npx prisma generate`)
3. Apply migrations:
   - Create migration adding `visibleInFilters` (default true) and dropping per-user visibility schema.
   - `npx prisma migrate dev`
4. Seed (optional): `bun prisma db seed`

## Run

- Dev server: `bun dev`
- Build: `bun build` then `bun start`

## Validate

- As Admin, open マスターデータ管理 > 授業タイプ; verify each row has a toggle (「フィルター表示」) reflecting `visibleInFilters`.
- Toggle a class type OFF; open any page with class type filters as student/teacher/staff — the hidden type should not appear.
- Toggle back ON; verify it reappears.
- CSV export includes `visibleInFilters` column; updating via CSV import updates the flag accordingly.

## Ops (Local DB Quick Checks)

- Check class types default:
  - `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT id, name, visibleInFilters FROM ClassType LIMIT 10;"`
