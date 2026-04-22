import { auth } from "@clerk/nextjs/server";
import type { AuthSession } from "../../types";

/** Returns the current user's session from the Clerk server context. */
export async function getServerSession(): Promise<AuthSession> {
  const { userId, sessionClaims } = await auth();
  const email =
    (sessionClaims as { email?: string; primary_email_address?: string } | null)
      ?.primary_email_address ??
    (sessionClaims as { email?: string } | null)?.email ??
    null;
  return { userId, email };
}
