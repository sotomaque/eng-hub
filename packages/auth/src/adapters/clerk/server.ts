import { auth } from "@clerk/nextjs/server";
import type { AuthSession } from "../../types";

/** Returns the current user's session from the Clerk server context. */
export async function getServerSession(): Promise<AuthSession> {
  const { userId } = await auth();
  return { userId };
}
