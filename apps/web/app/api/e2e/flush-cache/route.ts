import { invalidatePeopleCache, invalidateReferenceData } from "@workspace/api";

/**
 * Flushes reference-data caches (departments, titles, etc.) so E2E tests
 * always read fresh data from PostgreSQL instead of stale Redis entries.
 *
 * Only available on Vercel preview deployments.
 */
export async function POST() {
  if (process.env.VERCEL_ENV !== "preview") {
    return Response.json({ error: "Not available" }, { status: 404 });
  }

  await Promise.all([invalidateReferenceData(), invalidatePeopleCache()]);

  return Response.json({ flushed: true });
}
