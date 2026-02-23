
  create table "public"."pending_invites" (
    "id" text not null,
    "email" text not null,
    "person_id" text not null,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP
      );


alter table "public"."project_links" add column "tags" text[] default ARRAY[]::text[];

CREATE UNIQUE INDEX pending_invites_email_key ON public.pending_invites USING btree (email);

CREATE UNIQUE INDEX pending_invites_pkey ON public.pending_invites USING btree (id);

alter table "public"."pending_invites" add constraint "pending_invites_pkey" PRIMARY KEY using index "pending_invites_pkey";

alter table "public"."pending_invites" add constraint "pending_invites_person_id_fkey" FOREIGN KEY (person_id) REFERENCES public.people(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."pending_invites" validate constraint "pending_invites_person_id_fkey";

grant delete on table "public"."pending_invites" to "anon";

grant insert on table "public"."pending_invites" to "anon";

grant references on table "public"."pending_invites" to "anon";

grant select on table "public"."pending_invites" to "anon";

grant trigger on table "public"."pending_invites" to "anon";

grant truncate on table "public"."pending_invites" to "anon";

grant update on table "public"."pending_invites" to "anon";

grant delete on table "public"."pending_invites" to "authenticated";

grant insert on table "public"."pending_invites" to "authenticated";

grant references on table "public"."pending_invites" to "authenticated";

grant select on table "public"."pending_invites" to "authenticated";

grant trigger on table "public"."pending_invites" to "authenticated";

grant truncate on table "public"."pending_invites" to "authenticated";

grant update on table "public"."pending_invites" to "authenticated";

grant delete on table "public"."pending_invites" to "service_role";

grant insert on table "public"."pending_invites" to "service_role";

grant references on table "public"."pending_invites" to "service_role";

grant select on table "public"."pending_invites" to "service_role";

grant trigger on table "public"."pending_invites" to "service_role";

grant truncate on table "public"."pending_invites" to "service_role";

grant update on table "public"."pending_invites" to "service_role";


