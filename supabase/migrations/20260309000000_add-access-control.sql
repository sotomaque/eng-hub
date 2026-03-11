-- ============================================================
-- 1. Create ABAC tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.access_profiles (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.access_grants (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  person_id  TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS access_grants_person_profile_project_key
  ON public.access_grants(person_id, profile_id, project_id);
CREATE INDEX IF NOT EXISTS access_grants_person_id_idx
  ON public.access_grants(person_id);
CREATE INDEX IF NOT EXISTS access_grants_project_id_idx
  ON public.access_grants(project_id);

CREATE TABLE IF NOT EXISTS public.access_overrides (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  person_id  TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  effect     TEXT NOT NULL DEFAULT 'deny',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS access_overrides_person_project_cap_key
  ON public.access_overrides(person_id, project_id, capability);
CREATE INDEX IF NOT EXISTS access_overrides_person_id_idx
  ON public.access_overrides(person_id);

-- ============================================================
-- 2. Enable RLS + service_role policies
-- ============================================================

ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_access_profiles ON public.access_profiles;
CREATE POLICY service_role_access_profiles ON public.access_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS service_role_access_grants ON public.access_grants;
CREATE POLICY service_role_access_grants ON public.access_grants
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS service_role_access_overrides ON public.access_overrides;
CREATE POLICY service_role_access_overrides ON public.access_overrides
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Seed default profiles
-- ============================================================

INSERT INTO public.access_profiles (id, name, description, capabilities, is_default) VALUES
  ('profile-admin', 'Admin', 'Full access including admin panel', ARRAY[
    'admin:access',
    'project:read','project:write','project:delete',
    'project:health:read','project:health:write',
    'project:budget:read','project:budget:write',
    'project:team:read','project:team:write',
    'project:roadmap:read','project:roadmap:write',
    'project:stats:read',
    'project:links:read','project:links:write',
    'project:arrangements:read','project:arrangements:write',
    'person:read','person:write',
    'person:goals:read','person:goals:write',
    'person:reviews:read','person:reviews:write',
    'person:meetings:read','person:meetings:write',
    'person:comments:read','person:comments:write',
    'settings:read','settings:write'
  ], false),
  ('profile-full-access', 'Full Access', 'All read and write capabilities (no admin)', ARRAY[
    'project:read','project:write',
    'project:health:read','project:health:write',
    'project:budget:read','project:budget:write',
    'project:team:read','project:team:write',
    'project:roadmap:read','project:roadmap:write',
    'project:stats:read',
    'project:links:read','project:links:write',
    'project:arrangements:read','project:arrangements:write',
    'person:read','person:write',
    'person:goals:read','person:goals:write',
    'person:reviews:read','person:reviews:write',
    'person:meetings:read','person:meetings:write',
    'person:comments:read','person:comments:write',
    'settings:read','settings:write'
  ], true),
  ('profile-project-member', 'Project Member', 'Basic project access (scoped to membership)', ARRAY[
    'project:team:read',
    'project:roadmap:read',
    'project:links:read',
    'project:stats:read',
    'project:arrangements:read',
    'person:read'
  ], false),
  ('profile-project-viewer', 'Project Viewer', 'Project read only', ARRAY[
    'project:read'
  ], false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Grant "Full Access" to all existing users with a Clerk ID
-- ============================================================

INSERT INTO public.access_grants (id, person_id, profile_id, project_id)
SELECT
  gen_random_uuid()::text,
  p.id,
  'profile-full-access',
  NULL
FROM public.people p
WHERE p.clerk_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Grant Admin profile to bootstrap admin (Enrique Sotomayor)
-- ============================================================

INSERT INTO public.access_grants (id, person_id, profile_id, project_id)
SELECT gen_random_uuid()::text, 'cmlsxi37v000titr1xhpcpriz', 'profile-admin', NULL
WHERE EXISTS (SELECT 1 FROM public.people WHERE id = 'cmlsxi37v000titr1xhpcpriz')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5b. Grant Admin + Full Access to local E2E test user
-- ============================================================

INSERT INTO public.access_grants (id, person_id, profile_id, project_id)
SELECT gen_random_uuid()::text, p.id, 'profile-admin', NULL
FROM public.people p
WHERE p.clerk_user_id = 'user_3A0rYEEgZEHAsqqgIMpnBxK5Oqm'
ON CONFLICT DO NOTHING;

INSERT INTO public.access_grants (id, person_id, profile_id, project_id)
SELECT gen_random_uuid()::text, p.id, 'profile-full-access', NULL
FROM public.people p
WHERE p.clerk_user_id = 'user_3A0rYEEgZEHAsqqgIMpnBxK5Oqm'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. Drop old meeting sharing table (replaced by ABAC)
-- ============================================================

DROP TABLE IF EXISTS public.meeting_visibility_grants;
