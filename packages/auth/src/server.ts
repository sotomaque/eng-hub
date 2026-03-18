/**
 * Server-side auth entry point.
 *
 * To switch auth providers, change AUTH_PROVIDER in your environment:
 *   AUTH_PROVIDER=clerk        (default)
 *   AUTH_PROVIDER=supabase     (not yet implemented)
 *   AUTH_PROVIDER=better-auth  (not yet implemented)
 *
 * Each adapter module exports a `getServerSession()` function with
 * the same signature, so swapping providers is a single env-var change
 * once the adapter is implemented.
 */

export type { AuthSession } from "./types";

const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? "clerk";

import * as betterAuth from "./adapters/better-auth/server";
// Import all adapters at module load time; tree-shaking removes unused ones.
import * as clerk from "./adapters/clerk/server";
import * as supabase from "./adapters/supabase/server";

function selectAdapter() {
  switch (AUTH_PROVIDER) {
    case "supabase":
      return supabase;
    case "better-auth":
      return betterAuth;
    default:
      return clerk;
  }
}

const adapter = selectAdapter();

/**
 * Returns the current user's session from the server context (RSC / API route).
 * Returns `{ userId: null }` when no user is authenticated.
 */
export async function getServerSession() {
  return adapter.getServerSession();
}
