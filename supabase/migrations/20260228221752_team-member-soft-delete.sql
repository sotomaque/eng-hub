-- Add soft-delete column for rolled-off team members
alter table "public"."team_members" add column "left_at" timestamptz;

-- Drop the old unique constraint (person can only be on a project once)
alter table "public"."team_members" drop constraint if exists "team_members_person_id_project_id_key";

-- Replace with a partial unique index: only one ACTIVE membership per person+project
create unique index "team_members_person_id_project_id_active_key"
  on "public"."team_members" ("person_id", "project_id")
  where "left_at" is null;
