-- ============================================================
-- 1. Merge entries (individual PRs / commits)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.merge_entries (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id       TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  author_username  TEXT NOT NULL,
  merged_at        TIMESTAMPTZ NOT NULL,
  url              TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, author_username, title, merged_at)
);

CREATE INDEX IF NOT EXISTS merge_entries_project_merged_idx
  ON public.merge_entries(project_id, merged_at);

ALTER TABLE public.merge_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_merge_entries ON public.merge_entries;
CREATE POLICY service_role_merge_entries ON public.merge_entries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Merge summaries (cached AI-generated digests)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.merge_summaries (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id   TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_days  INTEGER NOT NULL,
  summary      TEXT NOT NULL,
  merge_count  INTEGER NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, period_days)
);

ALTER TABLE public.merge_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_merge_summaries ON public.merge_summaries;
CREATE POLICY service_role_merge_summaries ON public.merge_summaries
  FOR ALL TO service_role USING (true) WITH CHECK (true);
