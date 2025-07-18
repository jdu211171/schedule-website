-- CreateTable
CREATE TABLE "notification_archives" (
    "id" TEXT NOT NULL,
    "original_notification_id" TEXT NOT NULL,
    "recipient_type" VARCHAR(20),
    "recipient_id" VARCHAR(50),
    "notification_type" VARCHAR(50),
    "message" VARCHAR(255),
    "related_class_id" VARCHAR(50),
    "branch_id" TEXT,
    "branch_name" VARCHAR(100),
    "sent_via" VARCHAR(20),
    "sent_at" TIMESTAMP(6),
    "read_at" TIMESTAMP(6),
    "status" "NotificationStatus" NOT NULL,
    "notes" VARCHAR(255),
    "original_created_at" TIMESTAMP(6) NOT NULL,
    "original_updated_at" TIMESTAMP(6) NOT NULL,
    "scheduled_at" TIMESTAMP(6) NOT NULL,
    "processing_attempts" INTEGER NOT NULL DEFAULT 0,
    "logs" JSONB,
    "archived_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archive_reason" VARCHAR(50) NOT NULL DEFAULT 'CLEANUP_ARCHIVE',

    CONSTRAINT "notification_archives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_archives_status_archived_at_idx" ON "notification_archives"("status", "archived_at");

-- CreateIndex
CREATE INDEX "notification_archives_branch_id_archived_at_idx" ON "notification_archives"("branch_id", "archived_at");

-- CreateIndex
CREATE INDEX "notification_archives_original_created_at_idx" ON "notification_archives"("original_created_at");

-- CreateIndex
CREATE INDEX "notification_archives_archived_at_idx" ON "notification_archives"("archived_at");

-- CreateIndex
CREATE INDEX "notifications_status_created_at_idx" ON "notifications"("status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_branch_id_status_created_at_idx" ON "notifications"("branch_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");
