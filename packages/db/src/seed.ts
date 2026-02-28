// SQL equivalent: supabase/seed.sql (keep in sync)
// This function resets the preview database to the deterministic seed state.
// Only call on preview deployments via the /api/e2e/reset endpoint.

import { db } from "./index";

export async function resetAndSeed(): Promise<void> {
  // ── Truncate all data ──────────────────────────────────────────
  await db.$executeRawUnsafe(`TRUNCATE roles, projects, meeting_templates CASCADE`);

  // ── Departments (table: roles) ─────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO roles (id, name, color) VALUES
      ('dept-eng', 'Engineering', '#3B82F6'),
      ('dept-design', 'Design', '#8B5CF6'),
      ('dept-product', 'Product', '#10B981')
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Titles ─────────────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO titles (id, name, sort_order, department_id) VALUES
      ('title-swe', 'Software Engineer', 1, 'dept-eng'),
      ('title-sr-swe', 'Senior Software Engineer', 2, 'dept-eng'),
      ('title-em', 'Engineering Manager', 3, 'dept-eng'),
      ('title-designer', 'Product Designer', 1, 'dept-design'),
      ('title-pm', 'Product Manager', 1, 'dept-product')
    ON CONFLICT (id) DO NOTHING
  `);

  // ── People ─────────────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO people (id, first_name, last_name, email, role_id, title_id, updated_at) VALUES
      ('person-alice', 'Alice', 'Smith', 'alice@test.com', 'dept-eng', 'title-em', NOW()),
      ('person-bob', 'Bob', 'Jones', 'bob@test.com', 'dept-eng', 'title-sr-swe', NOW()),
      ('person-carol', 'Carol', 'Lee', 'carol@test.com', 'dept-eng', 'title-swe', NOW()),
      ('person-diana', 'Diana', 'Park', 'diana@test.com', 'dept-design', 'title-designer', NOW()),
      ('person-evan', 'Evan', 'Chen', 'evan@test.com', 'dept-product', 'title-pm', NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Manager relationships ──────────────────────────────────────
  await db.$executeRawUnsafe(`
    UPDATE people SET manager_id = 'person-alice' WHERE id IN ('person-bob', 'person-carol')
  `);

  // ── Projects ───────────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO projects (id, name, description, status, updated_at) VALUES
      ('proj-alpha', 'Alpha', 'Main test project for E2E tests', 'ACTIVE', NOW()),
      ('proj-beta', 'Beta', 'Sub-project of Alpha for hierarchy testing', 'PAUSED', NOW()),
      ('proj-gamma', 'Gamma', 'Standalone project for isolation testing', 'ARCHIVED', NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  await db.$executeRawUnsafe(`
    UPDATE projects SET parent_id = 'proj-alpha', funded_by_id = 'proj-alpha'
    WHERE id = 'proj-beta'
  `);

  // ── Teams ──────────────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO teams (id, name, project_id) VALUES
      ('team-frontend', 'Frontend', 'proj-alpha'),
      ('team-backend', 'Backend', 'proj-alpha'),
      ('team-design', 'Design', 'proj-alpha')
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Team members ───────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO team_members (id, person_id, project_id) VALUES
      ('tm-alice-alpha', 'person-alice', 'proj-alpha'),
      ('tm-bob-alpha', 'person-bob', 'proj-alpha'),
      ('tm-carol-alpha', 'person-carol', 'proj-alpha'),
      ('tm-diana-alpha', 'person-diana', 'proj-alpha'),
      ('tm-evan-gamma', 'person-evan', 'proj-gamma')
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Team memberships ───────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO team_memberships (id, team_id, team_member_id) VALUES
      ('tmem-bob-fe', 'team-frontend', 'tm-bob-alpha'),
      ('tmem-carol-be', 'team-backend', 'tm-carol-alpha'),
      ('tmem-diana-design', 'team-design', 'tm-diana-alpha')
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Project owners ────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO project_owners (id, person_id, project_id) VALUES
      ('po-alice-alpha', 'person-alice', 'proj-alpha'),
      ('po-evan-gamma', 'person-evan', 'proj-gamma')
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Health assessments ─────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO health_assessments (id, project_id, author_id, overall_status, created_at, updated_at) VALUES
      ('ha-alpha-1', 'proj-alpha', 'person-alice', 'GREEN', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
      ('ha-alpha-2', 'proj-alpha', 'person-alice', 'YELLOW', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Milestones ─────────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO milestones (id, title, description, status, sort_order, project_id, target_date, created_at, updated_at) VALUES
      ('ms-mvp', 'MVP Launch', 'Ship the minimum viable product', 'IN_PROGRESS', 1, 'proj-alpha', NOW() + INTERVAL '30 days', NOW(), NOW()),
      ('ms-beta', 'Beta Release', 'Public beta with feedback collection', 'NOT_STARTED', 2, 'proj-alpha', NOW() + INTERVAL '60 days', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Milestone assignments ──────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO milestone_assignments (id, milestone_id, person_id, created_at) VALUES
      ('ma-bob-mvp', 'ms-mvp', 'person-bob', NOW()),
      ('ma-carol-mvp', 'ms-mvp', 'person-carol', NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Quarterly goals ────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO quarterly_goals (id, title, quarter, status, sort_order, project_id, target_date, created_at, updated_at) VALUES
      ('qg-perf', 'Improve Performance', 'Q1 2026', 'IN_PROGRESS', 1, 'proj-alpha', NOW() + INTERVAL '45 days', NOW(), NOW()),
      ('qg-tests', 'Test Coverage 80%', 'Q1 2026', 'NOT_STARTED', 2, 'proj-alpha', NOW() + INTERVAL '60 days', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Key results ────────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO key_results (id, title, target_value, current_value, unit, status, sort_order, milestone_id, created_at, updated_at) VALUES
      ('kr-api', 'API response time < 200ms', 200, 350, 'ms', 'IN_PROGRESS', 1, 'ms-mvp', NOW(), NOW()),
      ('kr-coverage', 'Unit test coverage', 80, 45, '%', 'IN_PROGRESS', 1, NULL, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  await db.$executeRawUnsafe(`
    UPDATE key_results SET quarterly_goal_id = 'qg-tests' WHERE id = 'kr-coverage'
  `);

  // ── Project links ──────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO project_links (id, label, url, project_id) VALUES
      ('pl-docs', 'Documentation', 'https://docs.example.com', 'proj-alpha'),
      ('pl-figma', 'Figma Designs', 'https://figma.com/example', 'proj-alpha')
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Meeting templates ──────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO meeting_templates (id, name, description, content, author_id, created_at, updated_at) VALUES
      ('mt-1on1', 'Weekly 1:1', 'Quick weekly check-in template',
       '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Updates"}]},{"type":"paragraph","content":[{"type":"text","text":"What happened since last time?"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Blockers"}]},{"type":"paragraph","content":[{"type":"text","text":"Anything blocking progress?"}]}]}',
       'person-alice', NOW(), NOW()),
      ('mt-monthly', 'Monthly 1:1', 'In-depth monthly one-on-one template',
       '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Wins this month"}]},{"type":"paragraph","content":[{"type":"text","text":"What went well? Key accomplishments?"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Challenges"}]},{"type":"paragraph","content":[{"type":"text","text":"What was difficult or frustrating?"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Goals for next month"}]},{"type":"paragraph","content":[{"type":"text","text":"What are you focusing on?"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Growth & development"}]},{"type":"paragraph","content":[{"type":"text","text":"Skills, career, learning opportunities?"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Feedback"}]},{"type":"paragraph","content":[{"type":"text","text":"Anything I can do differently to support you?"}]}]}',
       'person-alice', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Meetings ───────────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO meetings (id, date, content, author_id, person_id, template_id, created_at, updated_at) VALUES
      ('meet-1', NOW() - INTERVAL '7 days',
       '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Discussed sprint progress. Bob is on track with the frontend refactor."}]}]}',
       'person-alice', 'person-bob', 'mt-1on1', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
      ('meet-2', NOW(),
       '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Weekly sync with Carol about backend performance."}]}]}',
       'person-alice', 'person-carol', NULL, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Person goals ───────────────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO person_goals (id, person_id, title, description, status, quarter, sort_order, created_at, updated_at) VALUES
      ('pg-bob-1', 'person-bob', 'Refactor auth module', 'Improve security and performance of the authentication layer', 'IN_PROGRESS', 'Q1 2026', 1, NOW(), NOW()),
      ('pg-bob-2', 'person-bob', 'Increase test coverage to 80%', NULL, 'NOT_STARTED', 'Q2 2026', 2, NOW(), NOW()),
      ('pg-alice-1', 'person-alice', 'Launch new onboarding flow', 'Ship the redesigned onboarding experience to all new users', 'IN_PROGRESS', 'Q1 2026', 1, NOW(), NOW()),
      ('pg-alice-2', 'person-alice', 'Hire two senior engineers', NULL, 'NOT_STARTED', 'Q2 2026', 2, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Person accomplishments ─────────────────────────────────────
  await db.$executeRawUnsafe(`
    INSERT INTO person_accomplishments (id, person_id, title, description, date, sort_order, created_at, updated_at) VALUES
      ('pa-bob-1', 'person-bob', 'Shipped API v2', 'Successfully migrated all internal clients to the new API', NOW() - INTERVAL '30 days', 1, NOW(), NOW()),
      ('pa-bob-2', 'person-bob', 'Reduced p99 latency by 40%', NULL, NOW() - INTERVAL '60 days', 2, NOW(), NOW()),
      ('pa-alice-1', 'person-alice', 'Led Q4 planning', 'Coordinated roadmap planning across three teams', NOW() - INTERVAL '14 days', 1, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Optional: link E2E test user to person-alice ───────────────
  // Set E2E_CLERK_USER_ID in Vercel preview env to enable CRUD tests on /me/goals.
  const e2eClerkUserId = process.env.E2E_CLERK_USER_ID;
  if (e2eClerkUserId) {
    await db.$executeRaw`UPDATE people SET clerk_user_id = ${e2eClerkUserId} WHERE id = 'person-alice'`;
  }
}
