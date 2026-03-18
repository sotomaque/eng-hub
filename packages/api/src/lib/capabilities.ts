export const CAPABILITIES = {
  ADMIN_ACCESS: "admin:access",

  PROJECT_READ: "project:read",
  PROJECT_WRITE: "project:write",
  PROJECT_DELETE: "project:delete",
  PROJECT_HEALTH_READ: "project:health:read",
  PROJECT_HEALTH_WRITE: "project:health:write",
  PROJECT_BUDGET_READ: "project:budget:read",
  PROJECT_BUDGET_WRITE: "project:budget:write",
  PROJECT_TEAM_READ: "project:team:read",
  PROJECT_TEAM_WRITE: "project:team:write",
  PROJECT_ROADMAP_READ: "project:roadmap:read",
  PROJECT_ROADMAP_WRITE: "project:roadmap:write",
  PROJECT_STATS_READ: "project:stats:read",
  PROJECT_LINKS_READ: "project:links:read",
  PROJECT_LINKS_WRITE: "project:links:write",
  PROJECT_ARRANGEMENTS_READ: "project:arrangements:read",
  PROJECT_ARRANGEMENTS_WRITE: "project:arrangements:write",
  PROJECT_GLOSSARY_READ: "project:glossary:read",
  PROJECT_GLOSSARY_WRITE: "project:glossary:write",

  PERSON_READ: "person:read",
  PERSON_WRITE: "person:write",
  PERSON_GOALS_READ: "person:goals:read",
  PERSON_GOALS_WRITE: "person:goals:write",
  PERSON_REVIEWS_READ: "person:reviews:read",
  PERSON_REVIEWS_WRITE: "person:reviews:write",
  PERSON_MEETINGS_READ: "person:meetings:read",
  PERSON_MEETINGS_WRITE: "person:meetings:write",
  PERSON_COMMENTS_READ: "person:comments:read",
  PERSON_COMMENTS_WRITE: "person:comments:write",

  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write",
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

/** Capabilities auto-granted to managers for their direct/indirect reports */
export const MANAGER_INHERITED_CAPABILITIES: Capability[] = [
  "person:read",
  "person:goals:read",
  "person:goals:write",
  "person:reviews:read",
  "person:reviews:write",
  "person:meetings:read",
  "person:meetings:write",
  "person:comments:read",
];

/** All capability values as an array (useful for admin UI) */
export const ALL_CAPABILITIES = Object.values(CAPABILITIES);
