-- CreateEnum
CREATE TYPE "NewsStatus" AS ENUM ('NEW', 'PUBLISHED', 'DISMISSED');

-- CreateTable
CREATE TABLE "news_items" (
    "id" UUID NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "publisher" VARCHAR(200) NOT NULL,
    "query" VARCHAR(100) NOT NULL,
    "status" "NewsStatus" NOT NULL DEFAULT 'NEW',
    "region" VARCHAR(10) NOT NULL DEFAULT 'KR',
    "lang" VARCHAR(10) NOT NULL DEFAULT 'ko',
    "title_ko" VARCHAR(300),
    "published_at" TIMESTAMPTZ(3),
    "reviewed_at" TIMESTAMPTZ(3),
    "case_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_items_url_key" ON "news_items"("url");

-- CreateIndex
CREATE INDEX "news_items_status_region_published_at_idx" ON "news_items"("status", "region", "published_at" DESC);

-- CreateIndex
CREATE INDEX "news_items_case_id_idx" ON "news_items"("case_id");

-- AddForeignKey
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
