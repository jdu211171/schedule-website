-- CreateTable
CREATE TABLE "branch_settings" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT,
    "archive_retention_months" INTEGER NOT NULL DEFAULT 6,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branch_settings_branch_id_key" ON "branch_settings"("branch_id");

-- CreateIndex
CREATE INDEX "branch_settings_branch_id_idx" ON "branch_settings"("branch_id");

-- AddForeignKey
ALTER TABLE "branch_settings" ADD CONSTRAINT "branch_settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE CASCADE;