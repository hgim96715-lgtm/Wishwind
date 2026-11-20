-- AlterTable
ALTER TABLE "user_answers" ADD COLUMN     "empathy_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "user_answer_empathies" (
    "answer_id" UUID NOT NULL,
    "voter_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_answer_empathies_pkey" PRIMARY KEY ("answer_id","voter_id")
);

-- CreateIndex
CREATE INDEX "user_answer_empathies_voter_id_idx" ON "user_answer_empathies"("voter_id");

-- AddForeignKey
ALTER TABLE "user_answer_empathies" ADD CONSTRAINT "user_answer_empathies_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "user_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
