-- Create performance_reviews table
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  person_id                 TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  author_id                 TEXT NOT NULL,
  cycle_label               TEXT NOT NULL,
  review_date               TIMESTAMPTZ NOT NULL,
  core_competency_score     DOUBLE PRECISION NOT NULL,
  teamwork_score            DOUBLE PRECISION NOT NULL,
  innovation_score          DOUBLE PRECISION NOT NULL,
  time_management_score     DOUBLE PRECISION NOT NULL,
  core_competency_comments  TEXT,
  teamwork_comments         TEXT,
  innovation_comments       TEXT,
  time_management_comments  TEXT,
  pdf_url                   TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one review per person per cycle
CREATE UNIQUE INDEX IF NOT EXISTS performance_reviews_person_id_cycle_label_key
  ON public.performance_reviews(person_id, cycle_label);

-- Index for fast lookup by person
CREATE INDEX IF NOT EXISTS performance_reviews_person_id_idx
  ON public.performance_reviews(person_id);

-- Enable RLS
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- Service role: full access (used by Prisma backend)
DROP POLICY IF EXISTS service_role_performance_reviews ON public.performance_reviews;
CREATE POLICY service_role_performance_reviews ON public.performance_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);
