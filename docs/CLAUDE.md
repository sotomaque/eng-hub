# CLAUDE.md - Project Guidelines for AI Code Reviews

## Project Overview

Eng Hub is an engineering project management dashboard. It uses a monorepo structure with Turborepo.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5.7+ (strict mode)
- **Package Manager**: Bun (not npm/yarn)
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui (Radix UI based)
- **Database**: Supabase (PostgreSQL) with Prisma ORM
- **API**: tRPC v11 (type-safe API layer)
- **Auth**: Clerk
- **Linting**: Biome
- **Environment**: t3-env for typesafe env validation

## Code Style

### Formatting
- 2-space indentation
- Double quotes for strings
- No semicolons (Biome handles this)
- Run `bun run lint` to check, `bun run lint:fix` to auto-fix

### Naming Conventions
- **Components**: PascalCase (`ProjectCard.tsx`)
- **Functions/Utils**: camelCase (`getProjectStatus`)
- **Types/Interfaces**: PascalCase (`Project`, `Contributor`)
- **Constants**: UPPER_SNAKE_CASE (`STATUS_COLORS`)
- **Database columns**: snake_case (Prisma schema)

### File Structure
```
apps/web/
├── app/           # Next.js App Router pages and API routes
├── components/    # Reusable React components
├── lib/           # Utilities, tRPC client, auth
├── __tests__/     # Unit tests (Bun test)
└── e2e/           # E2E tests (Playwright)
```

## Key Patterns

### Server vs Client Components
- Server Components are the default (no directive needed)
- Client Components must have `"use client"` at the top
- Keep client components minimal; prefer server components

### API Calls (tRPC)
- Define procedures in `packages/api/src/routers/`
- Use `publicProcedure` for unauthenticated endpoints
- Use `protectedProcedure` for authenticated endpoints
- Client-side: use `useTRPC` hooks from `@/lib/trpc/client`
- Server-side: use `createServerCaller` from `@/lib/trpc/server`

### Database Queries
- Use Prisma for all database operations (type-safe)
- Schema defined in `packages/db/prisma/schema.prisma`
- Client singleton exported from `packages/db`

### Type Safety
- Never use `any` type - use proper interfaces
- Use Zod for runtime validation (tRPC input schemas)
- All component props must be typed with interfaces
- Environment variables validated in `env.ts`

## Testing

### Unit Tests
- Location: `__tests__/**/*.test.ts`
- Framework: Bun test
- Run: `bun run test`

### E2E Tests
- Location: `e2e/**/*.spec.ts`
- Framework: Playwright
- Run: `bun run test:e2e`
- Test user flows, not implementation details

## PR Review Checklist

1. **Type Safety**: No `any` types, proper interfaces
2. **Error Handling**: Try-catch in server actions, meaningful error messages
3. **Server/Client Boundary**: Correct use of directives
4. **Database**: Using Prisma, not raw SQL
5. **API**: tRPC procedures with proper Zod input validation
6. **Testing**: Unit tests for utils, E2E for user flows
7. **Security**: No exposed secrets, proper input validation
8. **Performance**: No unnecessary re-renders, proper memoization
9. **Code Style**: Follows Biome rules, consistent naming

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server
bun run build        # Build for production
bun run lint         # Check linting
bun run lint:fix     # Fix linting issues
bun run typecheck    # TypeScript check (in apps/web)
bun run test         # Unit tests
bun run test:e2e     # E2E tests
```

## Important Notes

- Always use `bun` (not npm/yarn)
- Path alias `@/*` maps to project root (apps/web)
- Path alias `@workspace/ui/*` maps to shared UI package
- Client env vars must be prefixed with `NEXT_PUBLIC_`
- tRPC router defined in `packages/api`, consumed in `apps/web`
- Database schema and client in `packages/db`
