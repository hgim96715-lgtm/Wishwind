-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "victim_count_note" VARCHAR(100);

-- AlterTable
ALTER TABLE "suspects" ADD COLUMN     "identity_disclosed_at" DATE,
ADD COLUMN     "identity_disclosure_agency" VARCHAR(100),
ADD COLUMN     "identity_disclosure_source" VARCHAR(1000),
ADD COLUMN     "photo_source_agency" VARCHAR(100),
ADD COLUMN     "photo_source_url" VARCHAR(1000),
ADD COLUMN     "photo_url" VARCHAR(300);
