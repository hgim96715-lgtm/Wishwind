-- CreateEnum
CREATE TYPE "RelatedKind" AS ENUM ('DOCUMENTARY', 'TV_PROGRAM', 'YOUTUBE', 'PODCAST', 'MOVIE', 'SERIES', 'BOOK');

-- CreateTable
CREATE TABLE "related_contents" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "kind" "RelatedKind" NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "platform" VARCHAR(100) NOT NULL,
    "creator" VARCHAR(200),
    "url" VARCHAR(1000) NOT NULL,
    "release_year" SMALLINT,
    "language" VARCHAR(10) NOT NULL DEFAULT 'ko',
    "note" VARCHAR(300),
    "is_dramatized" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "related_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "related_contents_case_id_sort_order_idx" ON "related_contents"("case_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "related_contents_case_id_url_key" ON "related_contents"("case_id", "url");

-- AddForeignKey
ALTER TABLE "related_contents" ADD CONSTRAINT "related_contents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
