-- CreateEnum
CREATE TYPE "FileTarget" AS ENUM ('CASE', 'MISSING');

-- CreateEnum
CREATE TYPE "FileEventKind" AS ENUM ('VIEW', 'SHARE');

-- CreateTable
CREATE TABLE "file_events" (
    "id" UUID NOT NULL,
    "target" "FileTarget" NOT NULL,
    "target_key" VARCHAR(100) NOT NULL,
    "kind" "FileEventKind" NOT NULL,
    "channel" VARCHAR(20),
    "visitor_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_events_target_target_key_kind_created_at_idx" ON "file_events"("target", "target_key", "kind", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "file_events_target_target_key_kind_visitor_hash_key" ON "file_events"("target", "target_key", "kind", "visitor_hash");
