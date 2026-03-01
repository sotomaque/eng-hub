-- Enable RLS on all remaining tables as defense-in-depth.
-- The app connects via Prisma using the service_role, which bypasses RLS.
-- These policies prevent data exposure through direct Supabase REST/client access.
-- See: supabase-postgres-best-practices/references/security-rls-basics.md

-- ── Enable RLS ──────────────────────────────────────────────────────────

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrangement_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrangement_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_goal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_accomplishments ENABLE ROW LEVEL SECURITY;

-- ── Service role: full access (used by Prisma backend) ──────────────────

CREATE POLICY service_role_projects ON public.projects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_roles ON public.roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_teams ON public.teams
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_titles ON public.titles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_team_members ON public.team_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_team_memberships ON public.team_memberships
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_milestones ON public.milestones
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_quarterly_goals ON public.quarterly_goals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_key_results ON public.key_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_project_links ON public.project_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_team_arrangements ON public.team_arrangements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_arrangement_teams ON public.arrangement_teams
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_arrangement_assignments ON public.arrangement_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_github_syncs ON public.github_syncs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_contributor_stats ON public.contributor_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_meeting_templates ON public.meeting_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_milestone_assignments ON public.milestone_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_quarterly_goal_assignments ON public.quarterly_goal_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_pending_invites ON public.pending_invites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_favorite_projects ON public.favorite_projects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_project_owners ON public.project_owners
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_person_goals ON public.person_goals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_person_accomplishments ON public.person_accomplishments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
