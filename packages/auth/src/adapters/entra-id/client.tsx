"use client";

import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { cloneElement, isValidElement } from "react";
import type { ClientAuthSession } from "../../types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  if (status !== "authenticated") return null;
  return <>{children}</>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  if (status === "authenticated" || status === "loading") return null;
  return <>{children}</>;
}

export function SignInButton({ children }: { children: React.ReactNode }) {
  const handleClick = () => signIn("microsoft-entra-id");
  // Mirror Clerk's SignInButton behavior: clone the child element and inject onClick,
  // so callers can pass a styled Button without getting nested <button> elements.
  if (isValidElement<{ onClick?: () => void }>(children)) {
    return cloneElement(children, { onClick: handleClick });
  }
  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
}

/** Minimal initials fallback. The rich header dropdown lives in app-user-button.tsx. */
export function UserMenu() {
  const { data: session } = useSession();
  if (!session?.user) return null;
  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";
  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
      {initials}
    </div>
  );
}

/** Hook returning a function to sign the user out. Provider-agnostic. */
export function useSignOut(): () => Promise<void> {
  return async () => {
    await signOut();
  };
}

/** Hook returning a function that initiates the provider sign-in flow. */
export function useSignIn(): (opts?: { callbackUrl?: string }) => Promise<void> {
  return async (opts) => {
    await signIn("microsoft-entra-id", { callbackUrl: opts?.callbackUrl ?? "/projects" });
  };
}

export function useAuthSession(): ClientAuthSession {
  const { data: session, status } = useSession();
  return {
    userId: session?.user?.id ?? null,
    isLoaded: status !== "loading",
    isAdmin: (session?.user as { role?: string } | undefined)?.role === "admin",
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    imageUrl: session?.user?.image ?? null,
  };
}
