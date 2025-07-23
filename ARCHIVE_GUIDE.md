# Archive System Guide

## Overview

The archive system automatically preserves class session data based on a configurable global retention period. This allows you to delete teachers and students while maintaining historical records of their sessions. The default retention period is 6 months, but can be customized globally for all branches.

## Key Features

1. **Automatic Archiving**: Runs daily at midnight (UTC) via pg_cron
2. **Data Preservation**: Stores denormalized data without foreign key constraints
3. **Group Class Support**: Preserves enrolled student information as JSON
4. **Manual Trigger**: Admin users can manually run the archive process
5. **Comprehensive Search**: API endpoints for searching and analyzing archived data

## Archive Model

The `Archive` model stores:
- `classId`: Original class session ID
- `teacherName`: Teacher's name at time of archiving
- `studentName`: Student's name (for individual classes)
- `subjectName`: Subject name
- `boothName`: Booth/room name
- `branchName`: Branch name
- `classTypeName`: Class type name
- `enrolledStudents`: JSON array of enrolled students (for group classes)
- `date`, `startTime`, `endTime`, `duration`: Session timing details
- `notes`: Any session notes
- `archivedAt`: When the record was archived

## SQL Functions

### `archive_old_class_sessions()`
Main archiving function that:
1. Identifies sessions older than the global retention period
2. Captures enrolled students for group classes
3. Copies data to archives table with denormalized names
4. Deletes original sessions (cascade deletes enrollments)
5. Returns count of archived and deleted records

### `trigger_archive_manually()`
Wrapper function for manual execution that provides user-friendly output.

### `get_archive_retention_months()`
Helper function that returns the global retention period:
1. Checks for global settings (branch_id = NULL)
2. Defaults to 6 months if no settings exist

## API Endpoints

### 1. List Archives
```
GET /api/archives
```
Query parameters:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 25)
- `teacherName`: Filter by teacher name
- `studentName`: Filter by student name
- `subjectName`: Filter by subject name
- `branchName`: Filter by branch name
- `dateFrom`: Start date filter
- `dateTo`: End date filter

### 2. Archive Statistics
```
GET /api/archives/stats
```
Returns:
- Total archived count
- Date range of archives
- Monthly breakdown (last 12 months)
- Breakdown by branch
- Estimated storage size

### 3. Advanced Search
```
POST /api/archives/search
```
Body parameters:
- All filters from List Archives endpoint
- `classTypeName`: Filter by class type
- `enrolledStudentName`: Search within enrolled students
- `includeGroupClasses`: Filter for group vs individual classes

### 4. Manual Trigger
```
POST /api/archives/trigger
```
Manually runs the archive process using global retention settings (Admin only).

## Retention Configuration

### Setting Global Retention Period

The archive system uses a single global retention period that applies to all branches:

1. **Via SQL**:
   ```sql
   -- Set global retention to 12 months
   INSERT INTO branch_settings (branch_id, archive_retention_months) 
   VALUES (NULL, 12)
   ON CONFLICT (branch_id) DO UPDATE 
   SET archive_retention_months = 12;
   ```

2. **Via Admin UI**: 
   - Navigate to Dashboard → Settings → Archive Settings
   - Adjust the global retention period in months
   - Click Save to apply changes to all branches

### Default Setting
If no global setting is configured, the system defaults to 6 months.

## Setup Instructions

1. **Apply the database changes**:
   ```bash
   # The migration should already be applied
   bun prisma migrate deploy
   ```

2. **Create the archive functions**:
   ```bash
   # Run the global-only archive script in your database
   psql $DATABASE_URL < update_archive_global_only.sql
   ```

3. **Enable pg_cron** (if not already enabled):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

4. **Verify the cron job**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'archive-class-sessions-daily';
   ```

## Testing

Use the provided `test-archive.sql` script to:
1. Create test sessions older than the configured retention period
2. Run the archive process with custom retention if needed
3. Verify data was archived correctly

The archive process will use the configured global retention period:
```sql
-- Archive using global settings
SELECT trigger_archive_manually();
```

## Maintenance

### Monitoring
- Check archive statistics regularly via `/api/archives/stats`
- Monitor for archive failures in database logs
- Review storage growth over time

### Manual Operations
```sql
-- Check archive job status
SELECT * FROM cron.job WHERE jobname = 'archive-class-sessions-daily';

-- Disable automatic archiving
SELECT cron.unschedule('archive-class-sessions-daily');

-- Re-enable automatic archiving
SELECT cron.schedule(
    'archive-class-sessions-daily',
    '0 0 * * *',
    'SELECT archive_old_class_sessions();'
);

-- View recent archives
SELECT * FROM archives ORDER BY archived_at DESC LIMIT 10;
```

## Important Notes

1. **Irreversible**: Once sessions are archived and deleted, they cannot be restored to the original tables
2. **Cascade Deletion**: Deleting a session also removes related `StudentClassEnrollment` records
3. **No Foreign Keys**: Archive records have no foreign key constraints, allowing user deletion
4. **JSON Storage**: Enrolled students are stored as JSON, which may require special queries for searching

## Troubleshooting

### Archive process fails
1. Check database logs for error messages
2. Verify all required functions exist
3. Ensure pg_cron is enabled
4. Check for disk space issues

### Missing data in archives
1. Verify the session is actually older than 6 months
2. Check if it was already archived (unique constraint on class_id)
3. Review the archive function logic

### Performance issues
1. Add indexes if searching becomes slow:
   ```sql
   CREATE INDEX idx_archives_teacher_name ON archives(teacher_name);
   CREATE INDEX idx_archives_date ON archives(date);
   ```
2. Consider partitioning the archives table by year if it grows very large