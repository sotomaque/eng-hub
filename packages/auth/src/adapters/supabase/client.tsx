"use client";

import type { ClientAuthSession } from "../../types";

const MSG =
  "Supabase auth adapter is not yet implemented. Set AUTH_PROVIDER=clerk or implement this adapter.";

/** TODO: implement Supabase Auth client adapter. */

export function AuthProvider(_props: { children: React.ReactNode }): never {
  throw new Error(MSG);
}

export function SignedIn(_props: { children: React.ReactNode }): never {
  throw new Error(MSG);
}

export function SignedOut(_props: { children: React.ReactNode }): never {
  throw new Error(MSG);
}

export function SignInButton(_props: { children: React.ReactNode }): never {
  throw new Error(MSG);
}

export function useAuthSession(): ClientAuthSession {
  throw new Error(MSG);
}
