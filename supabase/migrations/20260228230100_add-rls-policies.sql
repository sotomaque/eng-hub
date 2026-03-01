-- Enable Row Level Security on sensitive tables as defense-in-depth.
-- The app connects via Prisma using the service_role, which bypasses RLS.
-- These policies prevent data exposure through direct Supabase REST/client access.
-- See: supabase-postgres-best-practices/references/security-rls-basics.md

-- ── Enable RLS ──────────────────────────────────────────────────────────

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_visibility_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_changes ENABLE ROW LEVEL SECURITY;

-- ── Service role: full access (used by Prisma backend) ──────────────────

CREATE POLICY service_role_meetings ON public.meetings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_person_comments ON public.person_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_health_assessments ON public.health_assessments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_meeting_visibility_grants ON public.meeting_visibility_grants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_people ON public.people
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_manager_changes ON public.manager_changes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Deny direct access for anon and authenticated roles ─────────────────
-- With RLS enabled and no permissive policies for these roles, access is
-- denied by default. No explicit deny policies needed.
