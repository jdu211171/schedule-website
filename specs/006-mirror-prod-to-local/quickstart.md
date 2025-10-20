Run a full mirror (fresh backup + restore):

```
DIRECT_URL=postgresql://user:pass@host:5432/db \
  scripts/mirror-prod-to-local.sh --yes
```

Dry-run without making changes:

```
DIRECT_URL=postgresql://user:pass@host:5432/db \
  scripts/mirror-prod-to-local.sh --dry-run
```

Restore from an existing date folder without taking a new backup:

```
DIRECT_URL=postgresql://user:pass@host:5432/db \
  scripts/mirror-prod-to-local.sh --date 2025-09-22 --skip-backup --yes
```

Override local connection:

```
LOCAL_URL=postgresql://postgres:postgres@localhost:5432/schedulewebsite \
DIRECT_URL=postgresql://user:pass@host:5432/db \
  scripts/mirror-prod-to-local.sh --yes
```
