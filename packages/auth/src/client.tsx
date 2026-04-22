/**
 * Client-side auth entry point.
 *
 * To switch auth providers, change NEXT_PUBLIC_AUTH_PROVIDER in your environment:
 *   NEXT_PUBLIC_AUTH_PROVIDER=clerk        (default)
 *   NEXT_PUBLIC_AUTH_PROVIDER=entra-id     (Microsoft Entra ID via Auth.js)
 *   NEXT_PUBLIC_AUTH_PROVIDER=test         (mock session for E2E tests)
 *   NEXT_PUBLIC_AUTH_PROVIDER=supabase     (not yet implemented)
 *   NEXT_PUBLIC_AUTH_PROVIDER=better-auth  (not yet implemented)
 *
 * Exports:
 *   AuthProvider   — mount at the app root
 *   SignedIn       — renders children only when authenticated
 *   SignedOut      — renders children only when not authenticated
 *   SignInButton   — sign-in trigger
 *   UserMenu       — user avatar/profile dropdown (replaces Clerk's UserButton)
 *   useAuthSession — hook: { userId, isLoaded, isAdmin }
 */

"use client";

export type { ClientAuthSession } from "./types";

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "clerk";

import * as betterAuth from "./adapters/better-auth/client";
import * as clerk from "./adapters/clerk/client";
import * as entraId from "./adapters/entra-id/client";
import * as supabase from "./adapters/supabase/client";
import * as test from "./adapters/test/client";

function selectAdapter() {
  switch (AUTH_PROVIDER) {
    case "entra-id":
      return entraId;
    case "test":
      return test;
    case "supabase":
      return supabase;
    case "better-auth":
      return betterAuth;
    default:
      return clerk;
  }
}

const adapter = selectAdapter();

export const AuthProvider = adapter.AuthProvider;
export const SignedIn = adapter.SignedIn;
export const SignedOut = adapter.SignedOut;
export const SignInButton = adapter.SignInButton;
export const UserMenu = adapter.UserMenu;
export function useAuthSession() {
  return adapter.useAuthSession();
}
export function useSignOut() {
  return adapter.useSignOut();
}
export function useSignIn() {
  return adapter.useSignIn();
}
