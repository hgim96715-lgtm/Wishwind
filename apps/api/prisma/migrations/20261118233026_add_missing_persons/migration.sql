-- CreateEnum
CREATE TYPE "MissingSource" AS ENUM ('FBI', 'SAFE182');

-- CreateEnum
CREATE TYPE "MissingStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "missing_persons" (
    "id" UUID NOT NULL,
    "source" "MissingSource" NOT NULL,
    "external_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "age_at_missing" INTEGER,
    "age_now" INTEGER,
    "missing_date" DATE,
    "last_seen_place" VARCHAR(300),
    "region" VARCHAR(100) NOT NULL,
    "appearance" TEXT,
    "description" TEXT,
    "photo_url" VARCHAR(500),
    "thumb_url" VARCHAR(500),
    "source_url" VARCHAR(500) NOT NULL,
    "status" "MissingStatus" NOT NULL DEFAULT 'ACTIVE',
    "cloud_count" INTEGER NOT NULL DEFAULT 0,
    "source_modified" TIMESTAMPTZ(3),
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "case_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "missing_persons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "missing_persons_status_region_missing_date_idx" ON "missing_persons"("status", "region", "missing_date" DESC);

-- CreateIndex
CREATE INDEX "missing_persons_case_id_idx" ON "missing_persons"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "missing_persons_source_external_id_key" ON "missing_persons"("source", "external_id");

-- AddForeignKey
ALTER TABLE "missing_persons" ADD CONSTRAINT "missing_persons_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
