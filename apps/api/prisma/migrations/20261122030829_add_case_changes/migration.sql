-- CreateEnum
CREATE TYPE "ChangeKind" AS ENUM ('LAW', 'DAY', 'SYSTEM');

-- CreateTable
CREATE TABLE "case_changes" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "kind" "ChangeKind" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "year" SMALLINT,
    "observed_on" VARCHAR(5),
    "country" "Country",
    "description" VARCHAR(500) NOT NULL,
    "source_url" VARCHAR(1000) NOT NULL,
    "source_title" VARCHAR(300) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "case_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_changes_observed_on_idx" ON "case_changes"("observed_on");

-- CreateIndex
CREATE UNIQUE INDEX "case_changes_case_id_name_key" ON "case_changes"("case_id", "name");

-- AddForeignKey
ALTER TABLE "case_changes" ADD CONSTRAINT "case_changes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
