-- Add optional reviewer (person) to performance reviews
ALTER TABLE "performance_reviews"
  ADD COLUMN IF NOT EXISTS "reviewer_id" TEXT;

-- Foreign key to people table with SET NULL on delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'performance_reviews_reviewer_id_fkey'
  ) THEN
    ALTER TABLE "performance_reviews"
      ADD CONSTRAINT "performance_reviews_reviewer_id_fkey"
      FOREIGN KEY ("reviewer_id") REFERENCES "people"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Index for lookups by reviewer
CREATE INDEX IF NOT EXISTS "performance_reviews_reviewer_id_idx"
  ON "performance_reviews"("reviewer_id");
