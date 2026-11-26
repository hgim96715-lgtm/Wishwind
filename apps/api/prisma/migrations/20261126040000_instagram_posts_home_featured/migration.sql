ALTER TABLE "cases" ADD COLUMN "is_home_featured" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "instagram_posts" (
    "id" UUID NOT NULL,
    "posted_on" DATE NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "case_slug" VARCHAR(200),
    "reach" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "profile_visits" INTEGER NOT NULL DEFAULT 0,
    "follows_gained" INTEGER NOT NULL DEFAULT 0,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "instagram_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "instagram_posts_posted_on_idx" ON "instagram_posts"("posted_on" DESC);
