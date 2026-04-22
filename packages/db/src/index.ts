import { PrismaClient } from "@prisma/client";
import { resolveStorageUrl } from "@workspace/storage/url";

export type {
  HealthStatus,
  PrismaClient,
  RoadmapStatus,
  StatsPeriod,
  SyncStatus,
  Trend,
} from "@prisma/client";

/**
 * Walks a Prisma result and rewrites any `imageUrl` / `fileUrl` values from
 * stored format (path for Supabase, full URL for legacy UploadThing rows)
 * into renderable URLs. Handles null, arrays, and nested includes.
 *
 * Only these two field names exist in the schema (Person/Project/Team use
 * `imageUrl`; Document uses `fileUrl`), so a blanket walker is safe — no
 * risk of transforming an unrelated same-named field.
 */
// biome-ignore lint/suspicious/noExplicitAny: recursive walker needs to accept any Prisma result shape
function resolveStorageFields(node: any): any {
  if (node === null || node === undefined) return node;
  if (Array.isArray(node)) return node.map(resolveStorageFields);
  if (typeof node !== "object") return node;
  if (node instanceof Date) return node;

  // biome-ignore lint/suspicious/noExplicitAny: see above
  const out: any = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "imageUrl" && typeof value === "string") {
      out[key] = resolveStorageUrl(value, "images");
    } else if (key === "fileUrl" && typeof value === "string") {
      out[key] = resolveStorageUrl(value, "documents");
    } else {
      out[key] = resolveStorageFields(value);
    }
  }
  return out;
}

/**
 * Prisma query extension that transparently turns stored storage values
 * into renderable URLs at read time. Unlike a result extension (which is
 * suppressed by explicit `select: { imageUrl: true }` clauses), a query
 * extension rewrites the returned data regardless of select/include shape.
 *
 * Writes are untouched — args pass through to Prisma verbatim, so
 * `data: { imageUrl: "abc/xyz.png" }` still stores the raw path.
 */
function createDbClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }).$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const result = await query(args);
          return resolveStorageFields(result);
        },
      },
    },
  });
}

/**
 * Extended Prisma client type (includes the storage-URL result transforms).
 * Import this instead of `PrismaClient` when typing helpers that accept the
 * shared `db` singleton or a transaction client derived from it.
 */
export type DbClient = ReturnType<typeof createDbClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: DbClient | undefined;
};

export const db: DbClient = globalForPrisma.prisma ?? createDbClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export { resetAndSeed } from "./seed";
