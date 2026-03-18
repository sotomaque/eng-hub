import type { AuthSession } from "../../types";

/** TODO: implement better-auth server adapter. */
export async function getServerSession(): Promise<AuthSession> {
  throw new Error(
    "better-auth adapter is not yet implemented. Set AUTH_PROVIDER=clerk or implement this adapter.",
  );
}
