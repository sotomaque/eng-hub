/** The minimum session data returned by any auth provider. */
export type AuthSession = {
  userId: string | null;
  email?: string | null;
};

/** Client-side session state available via useAuthSession(). */
export type ClientAuthSession = {
  userId: string | null;
  /** True once the auth provider has resolved the session. */
  isLoaded: boolean;
  /** True when the current user has admin privileges. */
  isAdmin: boolean;
  /** Display name if available. */
  name?: string | null;
  /** Primary email address if available. */
  email?: string | null;
  /** Profile image URL if available. */
  imageUrl?: string | null;
};
