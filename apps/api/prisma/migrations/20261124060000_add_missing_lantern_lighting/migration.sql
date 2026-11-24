CREATE TABLE "missing_lantern_lightings" (
  "person_id" UUID NOT NULL,
  "voter_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "missing_lantern_lightings_pkey" PRIMARY KEY ("person_id", "voter_id"),
  CONSTRAINT "missing_lantern_lightings_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "missing_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
