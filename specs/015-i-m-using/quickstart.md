# Quickstart: Production CSV Import Reliability

## Prerequisites
- Bun installed
- Local Postgres available for ops checks (optional)
- ENV configured per `.env.example` for Supabase

## Run locally
```
bun dev
```

## Import via API (curl)
```
curl -X POST \
  -F "file=@path/to/sample.csv" \
  http://localhost:3000/api/import/csv
```
Response (example):
```
{
  "processed": 10000,
  "created": 9000,
  "updated": 900,
  "skipped": 100,
  "errorsUri": "/api/import/sessions/uuid/errors.csv",
  "message": "Import completed with 100 skipped rows"
}
```

## CSV requirements
- Encoding: UTF-8 or Shift_JIS
- Contains internal database ID column for upsert
- Header must match provided template

Download template:
```
curl http://localhost:3000/api/import/template.csv -o template.csv
```

## Verify counts via psql (optional)
```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT COUNT(*) FROM <target_table>;"
```

## Common errors
- 400: Missing columns or unsupported encoding → Convert to UTF-8 or Shift_JIS and use template header
- 413: File too large → Reduce below hard cap
- 422: Row validation errors → Check errorsUri for detailed reasons
