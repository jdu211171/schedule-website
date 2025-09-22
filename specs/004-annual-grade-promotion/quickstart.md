# Quickstart

1) Enable cron (once):
```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "CREATE EXTENSION IF NOT EXISTS pg_cron;"
```

2) Apply promotion script:
```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -f scripts/annual-grade-promotion.sql
```

3) Manual run (for testing):
```
# Force execution even when it's not April
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT trigger_promote_student_grades(true);"
```
