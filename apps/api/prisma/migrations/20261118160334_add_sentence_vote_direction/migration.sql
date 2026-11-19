-- CreateEnum
CREATE TYPE "SentenceVoteDirection" AS ENUM ('TOO_LENIENT', 'TOO_HARSH');

-- AlterTable
ALTER TABLE "sentence_votes" ADD COLUMN     "direction" "SentenceVoteDirection";

-- AddCheckConstraint
ALTER TABLE "sentence_votes" ADD CONSTRAINT "sentence_votes_direction_only_on_disagree" CHECK ("direction" IS NULL OR "choice" = 'DISAGREE');
