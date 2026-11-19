/*
  Warnings:

  - You are about to drop the column `cloud_count` on the `missing_persons` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "missing_persons" DROP COLUMN "cloud_count",
ADD COLUMN     "description_ko" TEXT,
ADD COLUMN     "description_ko_source_hash" VARCHAR(64);

-- CreateTable
CREATE TABLE "cloud_messages" (
    "id" UUID NOT NULL,
    "voter_id" UUID NOT NULL,
    "body" VARCHAR(100) NOT NULL,
    "status" "UserContentStatus" NOT NULL DEFAULT 'HELD',
    "category" VARCHAR(40),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cloud_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cloud_messages_status_created_at_idx" ON "cloud_messages"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "cloud_messages_voter_id_created_at_idx" ON "cloud_messages"("voter_id", "created_at");
