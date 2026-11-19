-- CreateEnum
CREATE TYPE "UserContentStatus" AS ENUM ('PUBLISHED', 'HELD', 'BLOCKED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ModerationStage" AS ENUM ('REGEX', 'AI', 'FALLBACK', 'ADMIN');

-- CreateEnum
CREATE TYPE "ModerationVerdict" AS ENUM ('ALLOW', 'BLOCK', 'HOLD');

-- CreateTable
CREATE TABLE "user_answers" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "voter_id" UUID NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "status" "UserContentStatus" NOT NULL,
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_questions" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "voter_id" UUID NOT NULL,
    "body" VARCHAR(200) NOT NULL,
    "status" "UserContentStatus" NOT NULL,
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "curious_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_question_curious" (
    "user_question_id" UUID NOT NULL,
    "voter_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_question_curious_pkey" PRIMARY KEY ("user_question_id","voter_id")
);

-- CreateTable
CREATE TABLE "user_content_reports" (
    "id" UUID NOT NULL,
    "answer_id" UUID,
    "question_id" UUID,
    "voter_id" UUID NOT NULL,
    "reason" VARCHAR(200),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_content_moderations" (
    "id" UUID NOT NULL,
    "answer_id" UUID,
    "question_id" UUID,
    "stage" "ModerationStage" NOT NULL,
    "verdict" "ModerationVerdict" NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "reason" TEXT,
    "model" VARCHAR(100),
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_usd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_content_moderations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_answers_question_id_status_created_at_idx" ON "user_answers"("question_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "user_answers_voter_id_updated_at_idx" ON "user_answers"("voter_id", "updated_at");

-- CreateIndex
CREATE INDEX "user_answers_status_updated_at_idx" ON "user_answers"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_answers_question_id_voter_id_key" ON "user_answers"("question_id", "voter_id");

-- CreateIndex
CREATE INDEX "user_questions_case_id_status_curious_count_created_at_idx" ON "user_questions"("case_id", "status", "curious_count" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "user_questions_voter_id_updated_at_idx" ON "user_questions"("voter_id", "updated_at");

-- CreateIndex
CREATE INDEX "user_questions_status_updated_at_idx" ON "user_questions"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_questions_case_id_voter_id_key" ON "user_questions"("case_id", "voter_id");

-- CreateIndex
CREATE INDEX "user_question_curious_voter_id_idx" ON "user_question_curious"("voter_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_content_reports_answer_id_voter_id_key" ON "user_content_reports"("answer_id", "voter_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_content_reports_question_id_voter_id_key" ON "user_content_reports"("question_id", "voter_id");

-- CreateIndex
CREATE INDEX "user_content_moderations_answer_id_created_at_idx" ON "user_content_moderations"("answer_id", "created_at");

-- CreateIndex
CREATE INDEX "user_content_moderations_question_id_created_at_idx" ON "user_content_moderations"("question_id", "created_at");

-- CreateIndex
CREATE INDEX "user_content_moderations_verdict_created_at_idx" ON "user_content_moderations"("verdict", "created_at");

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "unsolved_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_questions" ADD CONSTRAINT "user_questions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_question_curious" ADD CONSTRAINT "user_question_curious_user_question_id_fkey" FOREIGN KEY ("user_question_id") REFERENCES "user_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_content_reports" ADD CONSTRAINT "user_content_reports_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "user_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_content_reports" ADD CONSTRAINT "user_content_reports_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "user_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_content_moderations" ADD CONSTRAINT "user_content_moderations_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "user_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_content_moderations" ADD CONSTRAINT "user_content_moderations_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "user_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "user_content_reports" ADD CONSTRAINT "user_content_reports_one_target" CHECK (num_nonnulls("answer_id", "question_id") = 1);
ALTER TABLE "user_content_moderations" ADD CONSTRAINT "user_content_moderations_one_target" CHECK (num_nonnulls("answer_id", "question_id") = 1);
