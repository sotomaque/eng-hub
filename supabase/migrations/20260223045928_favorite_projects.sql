
  create table if not exists "public"."favorite_projects" (
    "id" text not null,
    "person_id" text not null,
    "project_id" text not null,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP
      );


CREATE INDEX IF NOT EXISTS favorite_projects_person_id_idx ON public.favorite_projects USING btree (person_id);

CREATE UNIQUE INDEX IF NOT EXISTS favorite_projects_person_id_project_id_key ON public.favorite_projects USING btree (person_id, project_id);

CREATE UNIQUE INDEX IF NOT EXISTS favorite_projects_pkey ON public.favorite_projects USING btree (id);

CREATE INDEX IF NOT EXISTS favorite_projects_project_id_idx ON public.favorite_projects USING btree (project_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorite_projects_pkey') THEN
    alter table "public"."favorite_projects" add constraint "favorite_projects_pkey" PRIMARY KEY using index "favorite_projects_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorite_projects_person_id_fkey') THEN
    alter table "public"."favorite_projects" add constraint "favorite_projects_person_id_fkey" FOREIGN KEY (person_id) REFERENCES public.people(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
    alter table "public"."favorite_projects" validate constraint "favorite_projects_person_id_fkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorite_projects_project_id_fkey') THEN
    alter table "public"."favorite_projects" add constraint "favorite_projects_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
    alter table "public"."favorite_projects" validate constraint "favorite_projects_project_id_fkey";
  END IF;
END $$;

grant delete on table "public"."favorite_projects" to "anon";

grant insert on table "public"."favorite_projects" to "anon";

grant references on table "public"."favorite_projects" to "anon";

grant select on table "public"."favorite_projects" to "anon";

grant trigger on table "public"."favorite_projects" to "anon";

grant truncate on table "public"."favorite_projects" to "anon";

grant update on table "public"."favorite_projects" to "anon";

grant delete on table "public"."favorite_projects" to "authenticated";

grant insert on table "public"."favorite_projects" to "authenticated";

grant references on table "public"."favorite_projects" to "authenticated";

grant select on table "public"."favorite_projects" to "authenticated";

grant trigger on table "public"."favorite_projects" to "authenticated";

grant truncate on table "public"."favorite_projects" to "authenticated";

grant update on table "public"."favorite_projects" to "authenticated";

grant delete on table "public"."favorite_projects" to "service_role";

grant insert on table "public"."favorite_projects" to "service_role";

grant references on table "public"."favorite_projects" to "service_role";

grant select on table "public"."favorite_projects" to "service_role";

grant trigger on table "public"."favorite_projects" to "service_role";

grant truncate on table "public"."favorite_projects" to "service_role";

grant update on table "public"."favorite_projects" to "service_role";
