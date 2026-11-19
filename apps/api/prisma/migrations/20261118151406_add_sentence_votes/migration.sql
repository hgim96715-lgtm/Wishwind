-- CreateEnum
CREATE TYPE "SentenceVoteChoice" AS ENUM ('AGREE', 'DISAGREE');

-- CreateTable
CREATE TABLE "sentence_votes" (
    "id" UUID NOT NULL,
    "sentence_id" UUID NOT NULL,
    "voter_id" UUID NOT NULL,
    "choice" "SentenceVoteChoice" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sentence_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sentence_votes_sentence_id_choice_idx" ON "sentence_votes"("sentence_id", "choice");

-- CreateIndex
CREATE UNIQUE INDEX "sentence_votes_sentence_id_voter_id_key" ON "sentence_votes"("sentence_id", "voter_id");

-- AddForeignKey
ALTER TABLE "sentence_votes" ADD CONSTRAINT "sentence_votes_sentence_id_fkey" FOREIGN KEY ("sentence_id") REFERENCES "sentences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
