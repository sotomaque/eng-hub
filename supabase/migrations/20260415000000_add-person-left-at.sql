-- ============================================================
-- Add soft-delete / departure tracking to people
-- ============================================================

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS people_left_at_idx ON public.people(left_at);
