


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."HealthStatus" AS ENUM (
    'RED',
    'YELLOW',
    'GREEN'
);


ALTER TYPE "public"."HealthStatus" OWNER TO "postgres";


CREATE TYPE "public"."RoadmapStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'AT_RISK'
);


ALTER TYPE "public"."RoadmapStatus" OWNER TO "postgres";


CREATE TYPE "public"."StatsPeriod" AS ENUM (
    'all_time',
    'ytd'
);


ALTER TYPE "public"."StatsPeriod" OWNER TO "postgres";


CREATE TYPE "public"."SyncStatus" AS ENUM (
    'idle',
    'syncing',
    'error'
);


ALTER TYPE "public"."SyncStatus" OWNER TO "postgres";


CREATE TYPE "public"."Trend" AS ENUM (
    'up',
    'down',
    'stable'
);


ALTER TYPE "public"."Trend" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."arrangement_assignments" (
    "id" "text" NOT NULL,
    "arrangement_team_id" "text" NOT NULL,
    "team_member_id" "text" NOT NULL
);


ALTER TABLE "public"."arrangement_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."arrangement_teams" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "arrangement_id" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "live_team_id" "text"
);


ALTER TABLE "public"."arrangement_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_stats" (
    "id" "text" NOT NULL,
    "project_id" "text" NOT NULL,
    "github_username" "text" NOT NULL,
    "period" "public"."StatsPeriod" NOT NULL,
    "commits" integer DEFAULT 0 NOT NULL,
    "prs_opened" integer DEFAULT 0 NOT NULL,
    "prs_merged" integer DEFAULT 0 NOT NULL,
    "reviews_done" integer DEFAULT 0 NOT NULL,
    "additions" integer DEFAULT 0 NOT NULL,
    "deletions" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "avg_weekly_commits" double precision DEFAULT 0 NOT NULL,
    "recent_weekly_commits" double precision DEFAULT 0 NOT NULL,
    "trend" "public"."Trend" DEFAULT 'stable'::"public"."Trend" NOT NULL,
    "avg_weekly_reviews" double precision DEFAULT 0 NOT NULL,
    "recent_weekly_reviews" double precision DEFAULT 0 NOT NULL,
    "review_trend" "public"."Trend" DEFAULT 'stable'::"public"."Trend" NOT NULL
);


ALTER TABLE "public"."contributor_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."github_syncs" (
    "id" "text" NOT NULL,
    "project_id" "text" NOT NULL,
    "last_sync_at" timestamp(3) without time zone,
    "sync_status" "public"."SyncStatus" DEFAULT 'idle'::"public"."SyncStatus" NOT NULL,
    "sync_error" "text",
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."github_syncs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."health_assessments" (
    "id" "text" NOT NULL,
    "project_id" "text" NOT NULL,
    "author_id" "text" NOT NULL,
    "overall_status" "public"."HealthStatus" NOT NULL,
    "overall_notes" "jsonb",
    "growth_status" "public"."HealthStatus",
    "growth_notes" "jsonb",
    "margin_status" "public"."HealthStatus",
    "margin_notes" "jsonb",
    "longevity_status" "public"."HealthStatus",
    "longevity_notes" "jsonb",
    "client_satisfaction_status" "public"."HealthStatus",
    "client_satisfaction_notes" "jsonb",
    "engineering_vibe_status" "public"."HealthStatus",
    "engineering_vibe_notes" "jsonb",
    "product_vibe_status" "public"."HealthStatus",
    "product_vibe_notes" "jsonb",
    "design_vibe_status" "public"."HealthStatus",
    "design_vibe_notes" "jsonb",
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."health_assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."key_results" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "target_value" double precision NOT NULL,
    "current_value" double precision DEFAULT 0 NOT NULL,
    "unit" "text",
    "status" "public"."RoadmapStatus" DEFAULT 'NOT_STARTED'::"public"."RoadmapStatus" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "milestone_id" "text",
    "quarterly_goal_id" "text",
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."key_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manager_changes" (
    "id" "text" NOT NULL,
    "person_id" "text" NOT NULL,
    "old_manager_id" "text",
    "new_manager_id" "text",
    "changed_by" "text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."manager_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_templates" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "author_id" "text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."meeting_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_visibility_grants" (
    "id" "text" NOT NULL,
    "granter_id" "text" NOT NULL,
    "grantee_id" "text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."meeting_visibility_grants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" "text" NOT NULL,
    "date" timestamp(3) without time zone NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "author_id" "text" NOT NULL,
    "person_id" "text" NOT NULL,
    "template_id" "text",
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."meetings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."milestone_assignments" (
    "id" "text" NOT NULL,
    "milestone_id" "text" NOT NULL,
    "person_id" "text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."milestone_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."milestones" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "target_date" timestamp(3) without time zone,
    "status" "public"."RoadmapStatus" DEFAULT 'NOT_STARTED'::"public"."RoadmapStatus" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "project_id" "text" NOT NULL,
    "parent_id" "text",
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."milestones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."people" (
    "id" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "github_username" "text",
    "gitlab_username" "text",
    "image_url" "text",
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "clerk_user_id" "text",
    "manager_id" "text",
    "role_id" "text",
    "title_id" "text",
    "callsign" "text"
);


ALTER TABLE "public"."people" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."person_comments" (
    "id" "text" NOT NULL,
    "content" "text" NOT NULL,
    "person_id" "text" NOT NULL,
    "author_id" "text" NOT NULL,
    "author_person_id" "text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."person_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_links" (
    "id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "url" "text" NOT NULL,
    "project_id" "text" NOT NULL
);


ALTER TABLE "public"."project_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "github_url" "text",
    "gitlab_url" "text",
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "image_url" "text",
    "funded_by_id" "text",
    "parent_id" "text"
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quarterly_goal_assignments" (
    "id" "text" NOT NULL,
    "quarterly_goal_id" "text" NOT NULL,
    "person_id" "text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."quarterly_goal_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quarterly_goals" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "target_date" timestamp(3) without time zone,
    "status" "public"."RoadmapStatus" DEFAULT 'NOT_STARTED'::"public"."RoadmapStatus" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "project_id" "text" NOT NULL,
    "quarter" "text",
    "parent_id" "text",
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."quarterly_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text"
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_arrangements" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "project_id" "text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."team_arrangements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "text" NOT NULL,
    "project_id" "text" NOT NULL,
    "person_id" "text" NOT NULL
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_memberships" (
    "id" "text" NOT NULL,
    "team_id" "text" NOT NULL,
    "team_member_id" "text" NOT NULL
);


ALTER TABLE "public"."team_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "project_id" "text" NOT NULL,
    "image_url" "text",
    "description" "text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."titles" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "department_id" "text",
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."titles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."arrangement_assignments"
    ADD CONSTRAINT "arrangement_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."arrangement_teams"
    ADD CONSTRAINT "arrangement_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_stats"
    ADD CONSTRAINT "contributor_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."github_syncs"
    ADD CONSTRAINT "github_syncs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."health_assessments"
    ADD CONSTRAINT "health_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."key_results"
    ADD CONSTRAINT "key_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manager_changes"
    ADD CONSTRAINT "manager_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_templates"
    ADD CONSTRAINT "meeting_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_visibility_grants"
    ADD CONSTRAINT "meeting_visibility_grants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."milestone_assignments"
    ADD CONSTRAINT "milestone_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."person_comments"
    ADD CONSTRAINT "person_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_links"
    ADD CONSTRAINT "project_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quarterly_goal_assignments"
    ADD CONSTRAINT "quarterly_goal_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quarterly_goals"
    ADD CONSTRAINT "quarterly_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_arrangements"
    ADD CONSTRAINT "team_arrangements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_memberships"
    ADD CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."titles"
    ADD CONSTRAINT "titles_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "arrangement_assignments_arrangement_team_id_team_member_id_key" ON "public"."arrangement_assignments" USING "btree" ("arrangement_team_id", "team_member_id");



CREATE INDEX "arrangement_teams_arrangement_id_idx" ON "public"."arrangement_teams" USING "btree" ("arrangement_id");



CREATE UNIQUE INDEX "arrangement_teams_live_team_id_key" ON "public"."arrangement_teams" USING "btree" ("live_team_id");



CREATE UNIQUE INDEX "contributor_stats_project_id_github_username_period_key" ON "public"."contributor_stats" USING "btree" ("project_id", "github_username", "period");



CREATE INDEX "contributor_stats_project_id_idx" ON "public"."contributor_stats" USING "btree" ("project_id");



CREATE UNIQUE INDEX "github_syncs_project_id_key" ON "public"."github_syncs" USING "btree" ("project_id");



CREATE INDEX "health_assessments_project_id_idx" ON "public"."health_assessments" USING "btree" ("project_id");



CREATE INDEX "manager_changes_person_id_idx" ON "public"."manager_changes" USING "btree" ("person_id");



CREATE UNIQUE INDEX "meeting_visibility_grants_granter_id_grantee_id_key" ON "public"."meeting_visibility_grants" USING "btree" ("granter_id", "grantee_id");



CREATE INDEX "meetings_person_id_idx" ON "public"."meetings" USING "btree" ("person_id");



CREATE UNIQUE INDEX "milestone_assignments_milestone_id_person_id_key" ON "public"."milestone_assignments" USING "btree" ("milestone_id", "person_id");



CREATE INDEX "milestones_parent_id_idx" ON "public"."milestones" USING "btree" ("parent_id");



CREATE INDEX "milestones_project_id_idx" ON "public"."milestones" USING "btree" ("project_id");



CREATE UNIQUE INDEX "people_clerk_user_id_key" ON "public"."people" USING "btree" ("clerk_user_id");



CREATE UNIQUE INDEX "people_email_key" ON "public"."people" USING "btree" ("email");



CREATE INDEX "people_manager_id_idx" ON "public"."people" USING "btree" ("manager_id");



CREATE INDEX "people_role_id_idx" ON "public"."people" USING "btree" ("role_id");



CREATE INDEX "people_title_id_idx" ON "public"."people" USING "btree" ("title_id");



CREATE INDEX "person_comments_person_id_idx" ON "public"."person_comments" USING "btree" ("person_id");



CREATE INDEX "project_links_project_id_idx" ON "public"."project_links" USING "btree" ("project_id");



CREATE INDEX "projects_funded_by_id_idx" ON "public"."projects" USING "btree" ("funded_by_id");



CREATE INDEX "projects_parent_id_idx" ON "public"."projects" USING "btree" ("parent_id");



CREATE UNIQUE INDEX "quarterly_goal_assignments_quarterly_goal_id_person_id_key" ON "public"."quarterly_goal_assignments" USING "btree" ("quarterly_goal_id", "person_id");



CREATE INDEX "quarterly_goals_parent_id_idx" ON "public"."quarterly_goals" USING "btree" ("parent_id");



CREATE INDEX "quarterly_goals_project_id_idx" ON "public"."quarterly_goals" USING "btree" ("project_id");



CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles" USING "btree" ("name");



CREATE INDEX "team_arrangements_project_id_idx" ON "public"."team_arrangements" USING "btree" ("project_id");



CREATE INDEX "team_members_person_id_idx" ON "public"."team_members" USING "btree" ("person_id");



CREATE UNIQUE INDEX "team_members_person_id_project_id_key" ON "public"."team_members" USING "btree" ("person_id", "project_id");



CREATE INDEX "team_members_project_id_idx" ON "public"."team_members" USING "btree" ("project_id");



CREATE UNIQUE INDEX "team_memberships_team_id_team_member_id_key" ON "public"."team_memberships" USING "btree" ("team_id", "team_member_id");



CREATE INDEX "teams_project_id_idx" ON "public"."teams" USING "btree" ("project_id");



CREATE UNIQUE INDEX "titles_name_key" ON "public"."titles" USING "btree" ("name");



ALTER TABLE ONLY "public"."arrangement_assignments"
    ADD CONSTRAINT "arrangement_assignments_arrangement_team_id_fkey" FOREIGN KEY ("arrangement_team_id") REFERENCES "public"."arrangement_teams"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."arrangement_assignments"
    ADD CONSTRAINT "arrangement_assignments_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."arrangement_teams"
    ADD CONSTRAINT "arrangement_teams_arrangement_id_fkey" FOREIGN KEY ("arrangement_id") REFERENCES "public"."team_arrangements"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."arrangement_teams"
    ADD CONSTRAINT "arrangement_teams_live_team_id_fkey" FOREIGN KEY ("live_team_id") REFERENCES "public"."teams"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contributor_stats"
    ADD CONSTRAINT "contributor_stats_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."github_syncs"
    ADD CONSTRAINT "github_syncs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."health_assessments"
    ADD CONSTRAINT "health_assessments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."key_results"
    ADD CONSTRAINT "key_results_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."key_results"
    ADD CONSTRAINT "key_results_quarterly_goal_id_fkey" FOREIGN KEY ("quarterly_goal_id") REFERENCES "public"."quarterly_goals"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manager_changes"
    ADD CONSTRAINT "manager_changes_new_manager_id_fkey" FOREIGN KEY ("new_manager_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."manager_changes"
    ADD CONSTRAINT "manager_changes_old_manager_id_fkey" FOREIGN KEY ("old_manager_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."manager_changes"
    ADD CONSTRAINT "manager_changes_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_visibility_grants"
    ADD CONSTRAINT "meeting_visibility_grants_grantee_id_fkey" FOREIGN KEY ("grantee_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_visibility_grants"
    ADD CONSTRAINT "meeting_visibility_grants_granter_id_fkey" FOREIGN KEY ("granter_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."meeting_templates"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."milestone_assignments"
    ADD CONSTRAINT "milestone_assignments_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."milestone_assignments"
    ADD CONSTRAINT "milestone_assignments_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."milestones"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."person_comments"
    ADD CONSTRAINT "person_comments_author_person_id_fkey" FOREIGN KEY ("author_person_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."person_comments"
    ADD CONSTRAINT "person_comments_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_links"
    ADD CONSTRAINT "project_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_funded_by_id_fkey" FOREIGN KEY ("funded_by_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quarterly_goal_assignments"
    ADD CONSTRAINT "quarterly_goal_assignments_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quarterly_goal_assignments"
    ADD CONSTRAINT "quarterly_goal_assignments_quarterly_goal_id_fkey" FOREIGN KEY ("quarterly_goal_id") REFERENCES "public"."quarterly_goals"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quarterly_goals"
    ADD CONSTRAINT "quarterly_goals_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."quarterly_goals"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quarterly_goals"
    ADD CONSTRAINT "quarterly_goals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_arrangements"
    ADD CONSTRAINT "team_arrangements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_memberships"
    ADD CONSTRAINT "team_memberships_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_memberships"
    ADD CONSTRAINT "team_memberships_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."titles"
    ADD CONSTRAINT "titles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."roles"("id") ON UPDATE CASCADE ON DELETE SET NULL;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."arrangement_assignments" TO "anon";
GRANT ALL ON TABLE "public"."arrangement_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."arrangement_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."arrangement_teams" TO "anon";
GRANT ALL ON TABLE "public"."arrangement_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."arrangement_teams" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_stats" TO "anon";
GRANT ALL ON TABLE "public"."contributor_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_stats" TO "service_role";



GRANT ALL ON TABLE "public"."github_syncs" TO "anon";
GRANT ALL ON TABLE "public"."github_syncs" TO "authenticated";
GRANT ALL ON TABLE "public"."github_syncs" TO "service_role";



GRANT ALL ON TABLE "public"."health_assessments" TO "anon";
GRANT ALL ON TABLE "public"."health_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."health_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."key_results" TO "anon";
GRANT ALL ON TABLE "public"."key_results" TO "authenticated";
GRANT ALL ON TABLE "public"."key_results" TO "service_role";



GRANT ALL ON TABLE "public"."manager_changes" TO "anon";
GRANT ALL ON TABLE "public"."manager_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."manager_changes" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_templates" TO "anon";
GRANT ALL ON TABLE "public"."meeting_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_templates" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_visibility_grants" TO "anon";
GRANT ALL ON TABLE "public"."meeting_visibility_grants" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_visibility_grants" TO "service_role";



GRANT ALL ON TABLE "public"."meetings" TO "anon";
GRANT ALL ON TABLE "public"."meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."meetings" TO "service_role";



GRANT ALL ON TABLE "public"."milestone_assignments" TO "anon";
GRANT ALL ON TABLE "public"."milestone_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."milestone_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."milestones" TO "anon";
GRANT ALL ON TABLE "public"."milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."milestones" TO "service_role";



GRANT ALL ON TABLE "public"."people" TO "anon";
GRANT ALL ON TABLE "public"."people" TO "authenticated";
GRANT ALL ON TABLE "public"."people" TO "service_role";



GRANT ALL ON TABLE "public"."person_comments" TO "anon";
GRANT ALL ON TABLE "public"."person_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."person_comments" TO "service_role";



GRANT ALL ON TABLE "public"."project_links" TO "anon";
GRANT ALL ON TABLE "public"."project_links" TO "authenticated";
GRANT ALL ON TABLE "public"."project_links" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."quarterly_goal_assignments" TO "anon";
GRANT ALL ON TABLE "public"."quarterly_goal_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."quarterly_goal_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."quarterly_goals" TO "anon";
GRANT ALL ON TABLE "public"."quarterly_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."quarterly_goals" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."team_arrangements" TO "anon";
GRANT ALL ON TABLE "public"."team_arrangements" TO "authenticated";
GRANT ALL ON TABLE "public"."team_arrangements" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."team_memberships" TO "anon";
GRANT ALL ON TABLE "public"."team_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."team_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."titles" TO "anon";
GRANT ALL ON TABLE "public"."titles" TO "authenticated";
GRANT ALL ON TABLE "public"."titles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


