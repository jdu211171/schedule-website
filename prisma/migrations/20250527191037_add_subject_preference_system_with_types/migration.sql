-- CreateTable
CREATE TABLE "subject_types" (
    "subject_type_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_types_pkey" PRIMARY KEY ("subject_type_id")
);

-- CreateTable
CREATE TABLE "UserSubjectPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSubjectPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subject_types_name_key" ON "subject_types"("name");

-- CreateIndex
CREATE INDEX "UserSubjectPreference_userId_idx" ON "UserSubjectPreference"("userId");

-- CreateIndex
CREATE INDEX "UserSubjectPreference_subjectId_idx" ON "UserSubjectPreference"("subjectId");

-- CreateIndex
CREATE INDEX "UserSubjectPreference_subjectTypeId_idx" ON "UserSubjectPreference"("subjectTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubjectPreference_userId_subjectId_subjectTypeId_key" ON "UserSubjectPreference"("userId", "subjectId", "subjectTypeId");

-- AddForeignKey
ALTER TABLE "UserSubjectPreference" ADD CONSTRAINT "UserSubjectPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubjectPreference" ADD CONSTRAINT "UserSubjectPreference_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubjectPreference" ADD CONSTRAINT "UserSubjectPreference_subjectTypeId_fkey" FOREIGN KEY ("subjectTypeId") REFERENCES "subject_types"("subject_type_id") ON DELETE CASCADE ON UPDATE CASCADE;
