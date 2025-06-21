-- CreateTable
CREATE TABLE "sent_notifications" (
    "id" TEXT NOT NULL,
    "class_session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "sent_at" TIMESTAMP(6) NOT NULL,
    "message_content" VARCHAR(500),
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sent_notifications_class_session_id_idx" ON "sent_notifications"("class_session_id");

-- CreateIndex
CREATE INDEX "sent_notifications_user_id_idx" ON "sent_notifications"("user_id");

-- CreateIndex
CREATE INDEX "sent_notifications_type_idx" ON "sent_notifications"("type");

-- CreateIndex
CREATE INDEX "sent_notifications_sent_at_idx" ON "sent_notifications"("sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "sent_notifications_class_session_id_user_id_type_key" ON "sent_notifications"("class_session_id", "user_id", "type");

-- AddForeignKey
ALTER TABLE "sent_notifications" ADD CONSTRAINT "sent_notifications_class_session_id_fkey" FOREIGN KEY ("class_session_id") REFERENCES "class_sessions"("class_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sent_notifications" ADD CONSTRAINT "sent_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
