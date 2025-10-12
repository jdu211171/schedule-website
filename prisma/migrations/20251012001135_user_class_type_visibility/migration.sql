-- CreateTable
CREATE TABLE "public"."user_class_type_visibility_preferences" (
    "user_id" TEXT NOT NULL,
    "hidden_class_type_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_class_type_visibility_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "user_class_type_visibility_preferences_updated_at_idx" ON "public"."user_class_type_visibility_preferences"("updated_at");

-- AddForeignKey
ALTER TABLE "public"."user_class_type_visibility_preferences" ADD CONSTRAINT "user_class_type_visibility_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
