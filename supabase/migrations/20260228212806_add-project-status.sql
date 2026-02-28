create type "public"."ProjectStatus" as enum ('ACTIVE', 'PAUSED', 'ARCHIVED');

alter table "public"."projects" add column "status" public."ProjectStatus" not null default 'ACTIVE'::public."ProjectStatus";


