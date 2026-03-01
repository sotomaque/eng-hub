-- Add missing foreign key indexes for faster JOINs and CASCADE operations
-- See: supabase-postgres-best-practices/references/schema-foreign-key-indexes.md

-- key_results: milestone_id and quarterly_goal_id
CREATE INDEX IF NOT EXISTS key_results_milestone_id_idx ON public.key_results USING btree (milestone_id);
CREATE INDEX IF NOT EXISTS key_results_quarterly_goal_id_idx ON public.key_results USING btree (quarterly_goal_id);

-- milestone_assignments: person_id (milestoneId already covered by unique index)
CREATE INDEX IF NOT EXISTS milestone_assignments_person_id_idx ON public.milestone_assignments USING btree (person_id);

-- quarterly_goal_assignments: person_id (quarterlyGoalId already covered by unique index)
CREATE INDEX IF NOT EXISTS quarterly_goal_assignments_person_id_idx ON public.quarterly_goal_assignments USING btree (person_id);

-- arrangement_assignments: arrangement_team_id and team_member_id
CREATE INDEX IF NOT EXISTS arrangement_assignments_arrangement_team_id_idx ON public.arrangement_assignments USING btree (arrangement_team_id);
CREATE INDEX IF NOT EXISTS arrangement_assignments_team_member_id_idx ON public.arrangement_assignments USING btree (team_member_id);

-- team_memberships: team_member_id (teamId already covered by unique index)
CREATE INDEX IF NOT EXISTS team_memberships_team_member_id_idx ON public.team_memberships USING btree (team_member_id);

-- meeting_visibility_grants: granter_id and grantee_id
CREATE INDEX IF NOT EXISTS meeting_visibility_grants_granter_id_idx ON public.meeting_visibility_grants USING btree (granter_id);
CREATE INDEX IF NOT EXISTS meeting_visibility_grants_grantee_id_idx ON public.meeting_visibility_grants USING btree (grantee_id);

-- meetings: author_id (queried by getMyMeetings on every page load)
CREATE INDEX IF NOT EXISTS meetings_author_id_idx ON public.meetings USING btree (author_id);

-- person_comments: author_person_id
CREATE INDEX IF NOT EXISTS person_comments_author_person_id_idx ON public.person_comments USING btree (author_person_id);

-- pending_invites: person_id
CREATE INDEX IF NOT EXISTS pending_invites_person_id_idx ON public.pending_invites USING btree (person_id);
