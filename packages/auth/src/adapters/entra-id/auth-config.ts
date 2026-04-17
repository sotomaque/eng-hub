import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.ENTRA_CLIENT_ID,
      clientSecret: process.env.ENTRA_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.us/${process.env.ENTRA_TENANT_ID}/v2.0`,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.entraId = (profile as { oid?: string }).oid ?? account.providerAccountId;
        token.email = profile.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.entraId as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
});
