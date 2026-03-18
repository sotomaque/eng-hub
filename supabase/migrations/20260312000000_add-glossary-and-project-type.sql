-- Add ProjectType enum (idempotent via DO block — no IF NOT EXISTS for types in PG)
DO $$ BEGIN
  CREATE TYPE "ProjectType" AS ENUM ('STANDARD', 'PROTOTYPE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add type column to projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "type" "ProjectType" NOT NULL DEFAULT 'STANDARD';

-- Create glossary_entries table
CREATE TABLE IF NOT EXISTS "glossary_entries" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "glossary_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "glossary_entries_project_id_idx" ON "glossary_entries"("project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "glossary_entries_project_id_term_key" ON "glossary_entries"("project_id", "term");

-- Add FK constraint (idempotent via DO block — no IF NOT EXISTS for constraints in PG)
DO $$ BEGIN
  ALTER TABLE "glossary_entries" ADD CONSTRAINT "glossary_entries_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE "glossary_entries" ENABLE ROW LEVEL SECURITY;

-- Service role has full access (same pattern as other tables)
DROP POLICY IF EXISTS "glossary_entries_service_role" ON "glossary_entries";
CREATE POLICY "glossary_entries_service_role" ON "glossary_entries"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
