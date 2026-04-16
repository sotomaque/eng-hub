"use client";

import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
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
  return (
    <button type="button" onClick={() => signIn("microsoft-entra-id")}>
      {children}
    </button>
  );
}

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
    <div className="relative">
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium"
        onClick={() => signOut()}
        title={`${session.user.name ?? session.user.email ?? "User"} — click to sign out`}
      >
        {session.user.image ? (
          <img src={session.user.image} alt="" className="size-8 rounded-full" />
        ) : (
          initials
        )}
      </button>
    </div>
  );
}

export function useAuthSession(): ClientAuthSession {
  const { data: session, status } = useSession();
  return {
    userId: session?.user?.id ?? null,
    isLoaded: status !== "loading",
    isAdmin: (session?.user as { role?: string } | undefined)?.role === "admin",
  };
}
