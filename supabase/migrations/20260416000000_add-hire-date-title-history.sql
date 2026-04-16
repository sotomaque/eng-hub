-- ============================================================
-- 1. Add hire_date to people
-- ============================================================

ALTER TABLE public.people ADD COLUMN IF NOT EXISTS hire_date TIMESTAMPTZ;

-- ============================================================
-- 2. Title change audit table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.title_changes (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  person_id     TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  old_title_id  TEXT REFERENCES public.titles(id) ON DELETE SET NULL,
  new_title_id  TEXT REFERENCES public.titles(id) ON DELETE SET NULL,
  changed_by    TEXT NOT NULL,
  effective_at  TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS title_changes_person_effective_idx
  ON public.title_changes(person_id, effective_at);

ALTER TABLE public.title_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_title_changes ON public.title_changes;
CREATE POLICY service_role_title_changes ON public.title_changes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
