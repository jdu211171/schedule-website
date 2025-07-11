-- CreateTable
CREATE TABLE "line_channels" (
    "channel_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "channelAccessToken" TEXT NOT NULL,
    "channelSecret" TEXT NOT NULL,
    "webhook_url" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_rotated_at" TIMESTAMP(6),

    CONSTRAINT "line_channels_pkey" PRIMARY KEY ("channel_id")
);

-- CreateTable
CREATE TABLE "branch_line_channels" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_line_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "line_channels_is_active_idx" ON "line_channels"("is_active");

-- CreateIndex
CREATE INDEX "line_channels_is_default_idx" ON "line_channels"("is_default");

-- CreateIndex
CREATE INDEX "branch_line_channels_branch_id_idx" ON "branch_line_channels"("branch_id");

-- CreateIndex
CREATE INDEX "branch_line_channels_channel_id_idx" ON "branch_line_channels"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_line_channels_branch_id_channel_id_key" ON "branch_line_channels"("branch_id", "channel_id");

-- AddForeignKey
ALTER TABLE "branch_line_channels" ADD CONSTRAINT "branch_line_channels_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_line_channels" ADD CONSTRAINT "branch_line_channels_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "line_channels"("channel_id") ON DELETE CASCADE ON UPDATE CASCADE;
