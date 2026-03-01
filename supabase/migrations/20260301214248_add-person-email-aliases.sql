-- Add email_aliases column to people table for matching git commit authors
-- with alternate email addresses (personal, old work, local hostname, etc.)
ALTER TABLE people ADD COLUMN email_aliases text[] NOT NULL DEFAULT '{}';
