
  create table "public"."person_accomplishments" (
    "id" text not null,
    "person_id" text not null,
    "title" text not null,
    "description" text,
    "date" timestamp(3) without time zone,
    "sort_order" integer not null default 0,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
      );



  create table "public"."person_goals" (
    "id" text not null,
    "person_id" text not null,
    "title" text not null,
    "description" text,
    "status" public."RoadmapStatus" not null default 'NOT_STARTED'::public."RoadmapStatus",
    "target_date" timestamp(3) without time zone,
    "quarter" text,
    "sort_order" integer not null default 0,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
      );


CREATE INDEX person_accomplishments_person_id_idx ON public.person_accomplishments USING btree (person_id);

CREATE UNIQUE INDEX person_accomplishments_pkey ON public.person_accomplishments USING btree (id);

CREATE INDEX person_goals_person_id_idx ON public.person_goals USING btree (person_id);

CREATE UNIQUE INDEX person_goals_pkey ON public.person_goals USING btree (id);

alter table "public"."person_accomplishments" add constraint "person_accomplishments_pkey" PRIMARY KEY using index "person_accomplishments_pkey";

alter table "public"."person_goals" add constraint "person_goals_pkey" PRIMARY KEY using index "person_goals_pkey";

alter table "public"."person_accomplishments" add constraint "person_accomplishments_person_id_fkey" FOREIGN KEY (person_id) REFERENCES public.people(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."person_accomplishments" validate constraint "person_accomplishments_person_id_fkey";

alter table "public"."person_goals" add constraint "person_goals_person_id_fkey" FOREIGN KEY (person_id) REFERENCES public.people(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."person_goals" validate constraint "person_goals_person_id_fkey";

grant delete on table "public"."person_accomplishments" to "anon";

grant insert on table "public"."person_accomplishments" to "anon";

grant references on table "public"."person_accomplishments" to "anon";

grant select on table "public"."person_accomplishments" to "anon";

grant trigger on table "public"."person_accomplishments" to "anon";

grant truncate on table "public"."person_accomplishments" to "anon";

grant update on table "public"."person_accomplishments" to "anon";

grant delete on table "public"."person_accomplishments" to "authenticated";

grant insert on table "public"."person_accomplishments" to "authenticated";

grant references on table "public"."person_accomplishments" to "authenticated";

grant select on table "public"."person_accomplishments" to "authenticated";

grant trigger on table "public"."person_accomplishments" to "authenticated";

grant truncate on table "public"."person_accomplishments" to "authenticated";

grant update on table "public"."person_accomplishments" to "authenticated";

grant delete on table "public"."person_accomplishments" to "service_role";

grant insert on table "public"."person_accomplishments" to "service_role";

grant references on table "public"."person_accomplishments" to "service_role";

grant select on table "public"."person_accomplishments" to "service_role";

grant trigger on table "public"."person_accomplishments" to "service_role";

grant truncate on table "public"."person_accomplishments" to "service_role";

grant update on table "public"."person_accomplishments" to "service_role";

grant delete on table "public"."person_goals" to "anon";

grant insert on table "public"."person_goals" to "anon";

grant references on table "public"."person_goals" to "anon";

grant select on table "public"."person_goals" to "anon";

grant trigger on table "public"."person_goals" to "anon";

grant truncate on table "public"."person_goals" to "anon";

grant update on table "public"."person_goals" to "anon";

grant delete on table "public"."person_goals" to "authenticated";

grant insert on table "public"."person_goals" to "authenticated";

grant references on table "public"."person_goals" to "authenticated";

grant select on table "public"."person_goals" to "authenticated";

grant trigger on table "public"."person_goals" to "authenticated";

grant truncate on table "public"."person_goals" to "authenticated";

grant update on table "public"."person_goals" to "authenticated";

grant delete on table "public"."person_goals" to "service_role";

grant insert on table "public"."person_goals" to "service_role";

grant references on table "public"."person_goals" to "service_role";

grant select on table "public"."person_goals" to "service_role";

grant trigger on table "public"."person_goals" to "service_role";

grant truncate on table "public"."person_goals" to "service_role";

grant update on table "public"."person_goals" to "service_role";


