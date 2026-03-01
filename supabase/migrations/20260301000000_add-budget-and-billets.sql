-- Add budget field to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget DECIMAL(14, 2);

-- Create BilletLevel enum
DO $$ BEGIN
  CREATE TYPE "BilletLevel" AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create billets table
CREATE TABLE IF NOT EXISTS public.billets (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id    TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES public.roles(id),
  title_id      TEXT REFERENCES public.titles(id),
  level         "BilletLevel" NOT NULL,
  count         INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by project
CREATE INDEX IF NOT EXISTS billets_project_id_idx ON public.billets(project_id);

-- Enable RLS (consistent with other tables)
ALTER TABLE public.billets ENABLE ROW LEVEL SECURITY;

-- Service role: full access (used by Prisma backend)
CREATE POLICY service_role_billets ON public.billets
  FOR ALL TO service_role USING (true) WITH CHECK (true);
