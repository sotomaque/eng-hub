-- Add remaining missing foreign key indexes for faster JOINs and CASCADE operations
-- See: supabase-postgres-best-practices/references/schema-foreign-key-indexes.md

-- titles: department_id
CREATE INDEX IF NOT EXISTS titles_department_id_idx ON public.titles USING btree (department_id);

-- manager_changes: old_manager_id and new_manager_id
CREATE INDEX IF NOT EXISTS manager_changes_old_manager_id_idx ON public.manager_changes USING btree (old_manager_id);
CREATE INDEX IF NOT EXISTS manager_changes_new_manager_id_idx ON public.manager_changes USING btree (new_manager_id);

-- meetings: template_id
CREATE INDEX IF NOT EXISTS meetings_template_id_idx ON public.meetings USING btree (template_id);

-- billets: department_id and title_id (project_id already indexed in 20260301000000)
CREATE INDEX IF NOT EXISTS billets_department_id_idx ON public.billets USING btree (department_id);
CREATE INDEX IF NOT EXISTS billets_title_id_idx ON public.billets USING btree (title_id);
