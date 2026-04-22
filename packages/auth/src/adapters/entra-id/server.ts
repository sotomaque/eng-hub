import type { AuthSession } from "../../types";
import { auth } from "./auth-config";

export async function getServerSession(): Promise<AuthSession> {
  const session = await auth();
  return {
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
  };
}
