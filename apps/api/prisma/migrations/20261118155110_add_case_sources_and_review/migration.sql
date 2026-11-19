-- CreateEnum
CREATE TYPE "CaseReviewStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('COURT', 'GOVERNMENT', 'NEWS_AGENCY', 'NEWS', 'BROADCAST', 'OTHER');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('UNVERIFIED', 'QUOTE_MATCHED', 'CONFIRMED', 'CONFLICT');

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "is_published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_verified_at" TIMESTAMPTZ(3),
ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "review_status" "CaseReviewStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "case_sources" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "publisher" VARCHAR(200) NOT NULL,
    "type" "SourceType" NOT NULL DEFAULT 'NEWS',
    "published_at" DATE,
    "accessed_at" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "case_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_claims" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "field" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "case_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "case_sources_case_id_url_key" ON "case_sources"("case_id", "url");

-- CreateIndex
CREATE INDEX "case_claims_source_id_field_idx" ON "case_claims"("source_id", "field");

-- CreateIndex
CREATE INDEX "case_claims_status_idx" ON "case_claims"("status");

-- CreateIndex
CREATE INDEX "cases_is_published_occurred_at_idx" ON "cases"("is_published", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "cases_review_status_idx" ON "cases"("review_status");

-- AddForeignKey
ALTER TABLE "case_sources" ADD CONSTRAINT "case_sources_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_claims" ADD CONSTRAINT "case_claims_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "case_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 기존 사건은 공개를 유지하되 출처 확인 전이므로 검토 필요로 표시함
UPDATE "cases" SET "is_published" = true, "review_status" = 'NEEDS_REVIEW';
