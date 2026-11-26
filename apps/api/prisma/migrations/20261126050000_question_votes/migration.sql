CREATE TABLE "question_votes" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "voter_id" UUID NOT NULL,
    "choice" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_votes_question_id_voter_id_key" ON "question_votes"("question_id", "voter_id");
CREATE INDEX "question_votes_question_id_choice_idx" ON "question_votes"("question_id", "choice");

ALTER TABLE "question_votes" ADD CONSTRAINT "question_votes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "unsolved_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
