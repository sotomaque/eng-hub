/**
 * Server-side auth entry point.
 *
 * To switch auth providers, change AUTH_PROVIDER in your environment:
 *   AUTH_PROVIDER=clerk        (default)
 *   AUTH_PROVIDER=entra-id     (Microsoft Entra ID via Auth.js)
 *   AUTH_PROVIDER=test         (mock session for E2E tests)
 *   AUTH_PROVIDER=supabase     (not yet implemented)
 *   AUTH_PROVIDER=better-auth  (not yet implemented)
 */

export type { AuthSession } from "./types";

const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? "clerk";

async function getAdapter() {
  switch (AUTH_PROVIDER) {
    case "entra-id":
      return import("./adapters/entra-id/server");
    case "test":
      return import("./adapters/test/server");
    case "supabase":
      return import("./adapters/supabase/server");
    case "better-auth":
      return import("./adapters/better-auth/server");
    default:
      return import("./adapters/clerk/server");
  }
}

/**
 * Returns the current user's session from the server context (RSC / API route).
 * Returns `{ userId: null }` when no user is authenticated.
 */
export async function getServerSession() {
  const adapter = await getAdapter();
  return adapter.getServerSession();
}
