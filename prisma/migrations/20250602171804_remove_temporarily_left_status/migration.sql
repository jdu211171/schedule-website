/*
  Warnings:

  - The values [TEMPORARILY_LEFT] on the enum `UserStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('ACTIVE', 'SICK', 'PERMANENTLY_LEFT');
ALTER TABLE "students" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "teachers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "students" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TABLE "teachers" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "UserStatus_old";
ALTER TABLE "students" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "teachers" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;
