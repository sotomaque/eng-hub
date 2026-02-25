
  create table "public"."project_owners" (
    "id" text not null,
    "person_id" text not null,
    "project_id" text not null,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP
      );


CREATE INDEX project_owners_person_id_idx ON public.project_owners USING btree (person_id);

CREATE UNIQUE INDEX project_owners_person_id_project_id_key ON public.project_owners USING btree (person_id, project_id);

CREATE UNIQUE INDEX project_owners_pkey ON public.project_owners USING btree (id);

CREATE INDEX project_owners_project_id_idx ON public.project_owners USING btree (project_id);

alter table "public"."project_owners" add constraint "project_owners_pkey" PRIMARY KEY using index "project_owners_pkey";

alter table "public"."project_owners" add constraint "project_owners_person_id_fkey" FOREIGN KEY (person_id) REFERENCES public.people(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."project_owners" validate constraint "project_owners_person_id_fkey";

alter table "public"."project_owners" add constraint "project_owners_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."project_owners" validate constraint "project_owners_project_id_fkey";

grant delete on table "public"."project_owners" to "anon";

grant insert on table "public"."project_owners" to "anon";

grant references on table "public"."project_owners" to "anon";

grant select on table "public"."project_owners" to "anon";

grant trigger on table "public"."project_owners" to "anon";

grant truncate on table "public"."project_owners" to "anon";

grant update on table "public"."project_owners" to "anon";

grant delete on table "public"."project_owners" to "authenticated";

grant insert on table "public"."project_owners" to "authenticated";

grant references on table "public"."project_owners" to "authenticated";

grant select on table "public"."project_owners" to "authenticated";

grant trigger on table "public"."project_owners" to "authenticated";

grant truncate on table "public"."project_owners" to "authenticated";

grant update on table "public"."project_owners" to "authenticated";

grant delete on table "public"."project_owners" to "service_role";

grant insert on table "public"."project_owners" to "service_role";

grant references on table "public"."project_owners" to "service_role";

grant select on table "public"."project_owners" to "service_role";

grant trigger on table "public"."project_owners" to "service_role";

grant truncate on table "public"."project_owners" to "service_role";

grant update on table "public"."project_owners" to "service_role";


