-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('NAVER', 'GOOGLE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "voter_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_voter_id_key" ON "users"("voter_id");

-- CreateIndex
CREATE INDEX "user_accounts_user_id_idx" ON "user_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_provider_provider_user_id_key" ON "user_accounts"("provider", "provider_user_id");

-- AddForeignKey
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
