-- ============================================================
-- 1. Create skills tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.skills (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT skills_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS public.person_skills (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  person_id  TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  skill_id   TEXT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT person_skills_person_skill_key UNIQUE (person_id, skill_id)
);

CREATE INDEX IF NOT EXISTS person_skills_person_id_idx ON public.person_skills(person_id);
CREATE INDEX IF NOT EXISTS person_skills_skill_id_idx  ON public.person_skills(skill_id);

-- ============================================================
-- 2. Enable RLS + service_role policies
-- ============================================================

ALTER TABLE public.skills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_skills ON public.skills;
CREATE POLICY service_role_skills ON public.skills
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_person_skills ON public.person_skills;
CREATE POLICY service_role_person_skills ON public.person_skills
  FOR ALL TO service_role USING (true) WITH CHECK (true);
