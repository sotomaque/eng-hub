"use client";

import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import type { ClientAuthSession } from "../../types";

/**
 * Wraps ClerkProvider. Renders children as-is when the publishable key is
 * absent (e.g. local dev without Clerk configured).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}

export { SignedIn, SignedOut, SignInButton };

export function UserMenu() {
  return <UserButton />;
}

/** Hook to read the current session state on the client. */
export function useAuthSession(): ClientAuthSession {
  const { isLoaded, user } = useUser();
  const isAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";
  return {
    userId: user?.id ?? null,
    isLoaded,
    isAdmin,
  };
}
