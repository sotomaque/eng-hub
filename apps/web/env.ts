import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    POSTGRES_PRISMA_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string().optional(),
    UPLOADTHING_TOKEN: z.string().optional(),
    GITHUB_TOKEN: z.string().optional(),
    QSTASH_URL: z.string().url().optional(),
    QSTASH_TOKEN: z.string().optional(),
    QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
    QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
    E2E_RESET_SECRET: z.string().optional(),
    CLERK_WEBHOOK_SECRET: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    // Entra ID (Microsoft) — required when AUTH_PROVIDER=entra-id
    ENTRA_CLIENT_ID: z.string().optional(),
    ENTRA_CLIENT_SECRET: z.string().optional(),
    ENTRA_TENANT_ID: z.string().optional(),
    NEXTAUTH_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().url().optional(),
    // Auth provider selection
    AUTH_PROVIDER: z.enum(["clerk", "entra-id", "test", "supabase", "better-auth"]).optional(),
    // Test auth adapter
    TEST_AUTH_USER_ID: z.string().optional(),
    TEST_AUTH_EMAIL: z.string().optional(),
  },

  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_AUTH_PROVIDER: z
      .enum(["clerk", "entra-id", "test", "supabase", "better-auth"])
      .optional(),
  },

  runtimeEnv: {
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    QSTASH_URL: process.env.QSTASH_URL,
    QSTASH_TOKEN: process.env.QSTASH_TOKEN,
    QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
    E2E_RESET_SECRET: process.env.E2E_RESET_SECRET,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ENTRA_CLIENT_ID: process.env.ENTRA_CLIENT_ID,
    ENTRA_CLIENT_SECRET: process.env.ENTRA_CLIENT_SECRET,
    ENTRA_TENANT_ID: process.env.ENTRA_TENANT_ID,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_PROVIDER: process.env.AUTH_PROVIDER,
    TEST_AUTH_USER_ID: process.env.TEST_AUTH_USER_ID,
    TEST_AUTH_EMAIL: process.env.TEST_AUTH_EMAIL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_AUTH_PROVIDER: process.env.NEXT_PUBLIC_AUTH_PROVIDER,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
