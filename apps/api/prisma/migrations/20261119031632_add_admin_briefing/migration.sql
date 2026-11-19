-- CreateEnum
CREATE TYPE "BriefingKind" AS ENUM ('NOTICE', 'NEWS', 'CASE_UPDATE', 'OPINION');

-- CreateEnum
CREATE TYPE "BriefingStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "InquiryKind" AS ENUM ('QUESTION', 'CORRECTION', 'FEEDBACK');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- CreateTable
CREATE TABLE "briefing_posts" (
    "id" UUID NOT NULL,
    "kind" "BriefingKind" NOT NULL,
    "status" "BriefingStatus" NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "case_id" UUID,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "briefing_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "kind" "InquiryKind" NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'OPEN',
    "voter_id" UUID NOT NULL,
    "case_slug" VARCHAR(200),
    "body" VARCHAR(2000) NOT NULL,
    "reply" TEXT,
    "replied_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_voters" (
    "voter_id" UUID NOT NULL,
    "reason" VARCHAR(300),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_voters_pkey" PRIMARY KEY ("voter_id")
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" UUID NOT NULL,
    "path" VARCHAR(300) NOT NULL,
    "visitor_hash" VARCHAR(64) NOT NULL,
    "referrer_host" VARCHAR(200),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "briefing_posts_status_published_at_idx" ON "briefing_posts"("status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "briefing_posts_status_is_pinned_idx" ON "briefing_posts"("status", "is_pinned");

-- CreateIndex
CREATE INDEX "briefing_posts_case_id_idx" ON "briefing_posts"("case_id");

-- CreateIndex
CREATE INDEX "inquiries_kind_status_created_at_idx" ON "inquiries"("kind", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "inquiries_voter_id_created_at_idx" ON "inquiries"("voter_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "page_views_created_at_idx" ON "page_views"("created_at");

-- CreateIndex
CREATE INDEX "page_views_path_created_at_idx" ON "page_views"("path", "created_at");

-- AddForeignKey
ALTER TABLE "briefing_posts" ADD CONSTRAINT "briefing_posts_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
