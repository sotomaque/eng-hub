import type { AuthSession } from "../../types";

/** TODO: implement Supabase Auth server adapter. */
export async function getServerSession(): Promise<AuthSession> {
  throw new Error(
    "Supabase auth adapter is not yet implemented. Set AUTH_PROVIDER=clerk or implement this adapter.",
  );
}
