-- CreateEnum
CREATE TYPE "Country" AS ENUM ('KR', 'US', 'JP', 'CN', 'GB', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseCategory" AS ENUM ('MURDER', 'MISSING', 'KIDNAPPING', 'SEXUAL_CRIME', 'ROBBERY', 'ARSON', 'TERROR', 'FRAUD', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('UNSOLVED', 'IN_PROGRESS', 'SOLVED');

-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('DAY', 'MONTH', 'YEAR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SuspectStatus" AS ENUM ('SUSPECTED', 'ARRESTED', 'INDICTED', 'CONVICTED', 'ACQUITTED', 'CLEARED', 'DECEASED', 'AT_LARGE');

-- CreateEnum
CREATE TYPE "VictimStatus" AS ENUM ('DECEASED', 'INJURED', 'MISSING', 'FOUND_ALIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CourtLevel" AS ENUM ('FIRST', 'APPEAL', 'SUPREME', 'OTHER');

-- CreateEnum
CREATE TYPE "SentenceType" AS ENUM ('DEATH', 'LIFE', 'IMPRISONMENT', 'PROBATION', 'FINE', 'ACQUITTAL', 'OTHER');

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "overview" TEXT,
    "country" "Country" NOT NULL,
    "category" "CaseCategory" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'UNSOLVED',
    "location" VARCHAR(200),
    "occurred_at" DATE,
    "occurred_at_precision" "DatePrecision" NOT NULL DEFAULT 'DAY',
    "solved_at" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(3),
    "occurred_at_precision" "DatePrecision" NOT NULL DEFAULT 'DAY',
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspects" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "name" VARCHAR(100),
    "alias" VARCHAR(100),
    "description" TEXT,
    "charges" TEXT,
    "status" "SuspectStatus" NOT NULL DEFAULT 'SUSPECTED',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "suspects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "victims" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "name" VARCHAR(100),
    "alias" VARCHAR(100),
    "age" SMALLINT,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "description" TEXT,
    "status" "VictimStatus" NOT NULL DEFAULT 'UNKNOWN',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "victims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentences" (
    "id" UUID NOT NULL,
    "suspect_id" UUID NOT NULL,
    "court_level" "CourtLevel" NOT NULL DEFAULT 'FIRST',
    "court_name" VARCHAR(100),
    "type" "SentenceType" NOT NULL,
    "verdict" TEXT,
    "penalty" VARCHAR(200),
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "decided_at" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sentences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unsolved_questions" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "question" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "answer" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "unsolved_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspicious_circumstances" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "suspicious_circumstances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cases_slug_key" ON "cases"("slug");

-- CreateIndex
CREATE INDEX "cases_status_occurred_at_idx" ON "cases"("status", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "cases_country_category_occurred_at_idx" ON "cases"("country", "category", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "cases_category_occurred_at_idx" ON "cases"("category", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "timeline_events_case_id_occurred_at_sort_order_idx" ON "timeline_events"("case_id", "occurred_at", "sort_order");

-- CreateIndex
CREATE INDEX "suspects_case_id_sort_order_idx" ON "suspects"("case_id", "sort_order");

-- CreateIndex
CREATE INDEX "victims_case_id_sort_order_idx" ON "victims"("case_id", "sort_order");

-- CreateIndex
CREATE INDEX "sentences_suspect_id_decided_at_idx" ON "sentences"("suspect_id", "decided_at");

-- CreateIndex
CREATE INDEX "unsolved_questions_case_id_sort_order_idx" ON "unsolved_questions"("case_id", "sort_order");

-- CreateIndex
CREATE INDEX "suspicious_circumstances_case_id_sort_order_idx" ON "suspicious_circumstances"("case_id", "sort_order");

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspects" ADD CONSTRAINT "suspects_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "victims" ADD CONSTRAINT "victims_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentences" ADD CONSTRAINT "sentences_suspect_id_fkey" FOREIGN KEY ("suspect_id") REFERENCES "suspects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unsolved_questions" ADD CONSTRAINT "unsolved_questions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspicious_circumstances" ADD CONSTRAINT "suspicious_circumstances_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
