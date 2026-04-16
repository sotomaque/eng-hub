"use client";

import type { ClientAuthSession } from "../../types";

/**
 * Test auth adapter — always authenticated, no real provider.
 * Use with NEXT_PUBLIC_AUTH_PROVIDER=test for E2E tests.
 */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SignedOut(_props: { children: React.ReactNode }) {
  return null;
}

export function SignInButton(_props: { children: React.ReactNode }) {
  return null;
}

export function UserMenu() {
  return null;
}

export function useAuthSession(): ClientAuthSession {
  return { userId: null, isLoaded: true, isAdmin: true };
}
