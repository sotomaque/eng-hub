"use client";

import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useClerk,
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

/** Hook returning a function to sign the user out. Provider-agnostic. */
export function useSignOut(): () => Promise<void> {
  const { signOut } = useClerk();
  return async () => {
    await signOut();
  };
}

/**
 * Hook returning a function that initiates the provider sign-in flow.
 * For Clerk, opening the modal sign-in is handled by <SignInButton>; this
 * fallback routes to Clerk's hosted sign-in page with a redirect URL.
 */
export function useSignIn(): (opts?: { callbackUrl?: string }) => Promise<void> {
  const { redirectToSignIn } = useClerk();
  return async (opts) => {
    await redirectToSignIn({ signInForceRedirectUrl: opts?.callbackUrl ?? "/projects" });
  };
}

/** Hook to read the current session state on the client. */
export function useAuthSession(): ClientAuthSession {
  const { isLoaded, user } = useUser();
  const isAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";
  const name = user?.fullName ?? user?.firstName ?? null;
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const imageUrl = user?.imageUrl ?? null;
  return {
    userId: user?.id ?? null,
    isLoaded,
    isAdmin,
    name,
    email,
    imageUrl,
  };
}
