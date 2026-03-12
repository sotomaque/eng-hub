-- Add ProjectType enum and type column to projects
CREATE TYPE "ProjectType" AS ENUM ('STANDARD', 'PROTOTYPE');
ALTER TABLE "projects" ADD COLUMN "type" "ProjectType" NOT NULL DEFAULT 'STANDARD';

-- Create glossary_entries table
CREATE TABLE "glossary_entries" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "glossary_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "glossary_entries_project_id_idx" ON "glossary_entries"("project_id");
CREATE UNIQUE INDEX "glossary_entries_project_id_term_key" ON "glossary_entries"("project_id", "term");

ALTER TABLE "glossary_entries" ADD CONSTRAINT "glossary_entries_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "glossary_entries" ENABLE ROW LEVEL SECURITY;

-- Service role has full access (same pattern as other tables)
CREATE POLICY "glossary_entries_service_role" ON "glossary_entries"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
