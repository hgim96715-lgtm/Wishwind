-- CreateTable
CREATE TABLE "case_remembers" (
    "id" UUID NOT NULL,
    "case_slug" VARCHAR(200) NOT NULL,
    "visitor_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_remembers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_remembers_case_slug_created_at_idx" ON "case_remembers"("case_slug", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "case_remembers_case_slug_visitor_hash_key" ON "case_remembers"("case_slug", "visitor_hash");
