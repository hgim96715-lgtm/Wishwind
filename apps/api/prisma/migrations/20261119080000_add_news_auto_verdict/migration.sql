-- CreateEnum
CREATE TYPE "NewsAutoVerdict" AS ENUM ('PUBLISH', 'HOLD', 'DISMISS');

-- AlterTable
ALTER TABLE "news_items" ADD COLUMN     "auto_reason" VARCHAR(300),
ADD COLUMN     "auto_verdict" "NewsAutoVerdict";
