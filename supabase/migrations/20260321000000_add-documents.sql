-- ============================================================
-- 1. Create documents table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title           TEXT NOT NULL,
  description     TEXT,
  file_url        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_size       INTEGER,
  mime_type       TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  project_id      TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  person_id       TEXT REFERENCES public.people(id) ON DELETE CASCADE,
  uploaded_by_id  TEXT NOT NULL REFERENCES public.people(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_project_id_idx ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS documents_person_id_idx  ON public.documents(person_id);

-- ============================================================
-- 2. Enable RLS + service_role policy
-- ============================================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_documents ON public.documents;
CREATE POLICY service_role_documents ON public.documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Add document capabilities to existing access profiles
-- ============================================================

-- Full Access: add read + write for project and person documents
UPDATE public.access_profiles
SET capabilities = array_cat(
  capabilities,
  ARRAY[
    'project:documents:read',
    'project:documents:write',
    'person:documents:read',
    'person:documents:write'
  ]
)
WHERE id = 'profile-full-access'
  AND NOT capabilities @> ARRAY['project:documents:read'];

-- Project Member: add project document read access
UPDATE public.access_profiles
SET capabilities = array_cat(
  capabilities,
  ARRAY['project:documents:read']
)
WHERE id = 'profile-project-member'
  AND NOT capabilities @> ARRAY['project:documents:read'];
