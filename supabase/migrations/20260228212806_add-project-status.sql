DO $$ BEGIN
  CREATE TYPE "public"."ProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "public"."projects" ADD COLUMN IF NOT EXISTS "status" public."ProjectStatus" NOT NULL DEFAULT 'ACTIVE'::public."ProjectStatus";


