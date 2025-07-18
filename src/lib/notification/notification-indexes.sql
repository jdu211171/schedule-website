-- Database indexes to optimize notification cleanup queries
-- These indexes should improve performance for cleanup operations

-- Index for cleanup queries by status and creation date
-- This is the most important index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup_status_created 
ON notifications (status, created_at);

-- Index for cleanup queries by status and creation date with branch filtering
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup_status_created_branch 
ON notifications (status, created_at, branch_id);

-- Index for branch-specific cleanup operations
CREATE INDEX IF NOT EXISTS idx_notifications_branch_status_created 
ON notifications (branch_id, status, created_at);

-- Index for scheduled cleanup operations (existing index enhanced)
-- Note: This might already exist, check schema.prisma
CREATE INDEX IF NOT EXISTS idx_notifications_status_scheduled 
ON notifications (status, scheduled_at);

-- Composite index for efficient batch deletion
CREATE INDEX IF NOT EXISTS idx_notifications_batch_cleanup 
ON notifications (status, created_at, notification_id);

-- Index for monitoring and statistics queries
CREATE INDEX IF NOT EXISTS idx_notifications_created_status 
ON notifications (created_at DESC, status);

-- Index for recipient-based cleanup operations (if needed)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created 
ON notifications (recipient_type, recipient_id, created_at);

-- Partial indexes for specific statuses (PostgreSQL only)
-- These are more efficient for large tables with many statuses

-- Index for SENT notifications (most common cleanup target)
CREATE INDEX IF NOT EXISTS idx_notifications_sent_created 
ON notifications (created_at) 
WHERE status = 'SENT';

-- Index for FAILED notifications
CREATE INDEX IF NOT EXISTS idx_notifications_failed_created 
ON notifications (created_at) 
WHERE status = 'FAILED';

-- Index for branch-specific SENT notifications
CREATE INDEX IF NOT EXISTS idx_notifications_sent_branch_created 
ON notifications (branch_id, created_at) 
WHERE status = 'SENT';

-- Index for branch-specific FAILED notifications
CREATE INDEX IF NOT EXISTS idx_notifications_failed_branch_created 
ON notifications (branch_id, created_at) 
WHERE status = 'FAILED';

-- Analyze table statistics after creating indexes
-- Run this manually after index creation
-- ANALYZE notifications;