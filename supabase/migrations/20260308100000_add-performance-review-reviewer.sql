-- Add optional reviewer (person) to performance reviews
ALTER TABLE "performance_reviews"
  ADD COLUMN "reviewer_id" TEXT;

-- Foreign key to people table with SET NULL on delete
ALTER TABLE "performance_reviews"
  ADD CONSTRAINT "performance_reviews_reviewer_id_fkey"
  FOREIGN KEY ("reviewer_id") REFERENCES "people"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for lookups by reviewer
CREATE INDEX "performance_reviews_reviewer_id_idx"
  ON "performance_reviews"("reviewer_id");
