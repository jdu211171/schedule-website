-- CreateTable
CREATE TABLE "line_message_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "template_type" VARCHAR(50) NOT NULL,
    "timing_type" VARCHAR(20) NOT NULL,
    "timing_value" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "line_message_templates_branch_id_idx" ON "line_message_templates"("branch_id");

-- CreateIndex
CREATE INDEX "line_message_templates_template_type_idx" ON "line_message_templates"("template_type");

-- CreateIndex
CREATE INDEX "line_message_templates_is_active_idx" ON "line_message_templates"("is_active");

-- AddForeignKey
ALTER TABLE "line_message_templates" ADD CONSTRAINT "line_message_templates_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE CASCADE;
