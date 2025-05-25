/*
  Warnings:

  - You are about to drop the column `offeringCode` on the `subject_offerings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "subject_offerings_offeringCode_key";

-- AlterTable
ALTER TABLE "subject_offerings" DROP COLUMN "offeringCode";
