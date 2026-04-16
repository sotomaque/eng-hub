import type { AuthSession } from "../../types";

/**
 * Test auth adapter — returns a hardcoded session from env vars.
 * Use with AUTH_PROVIDER=test for E2E tests that bypass real auth.
 */
export async function getServerSession(): Promise<AuthSession> {
  const userId = process.env.TEST_AUTH_USER_ID ?? null;
  const email = process.env.TEST_AUTH_EMAIL ?? null;
  return { userId, email };
}
