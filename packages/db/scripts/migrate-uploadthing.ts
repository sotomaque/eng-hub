/**
 * Phase 1 storage migration: copy every UploadThing-hosted file referenced in
 * the DB over to Supabase Storage, then rewrite the stored value to the new
 * object path. Idempotent (rows whose value doesn't start with https://utfs.io
 * are skipped) and restartable.
 *
 * Run from apps/web so .env.local is picked up:
 *
 *   cd apps/web && bun run env:prod
 *   bun ../../packages/db/scripts/migrate-uploadthing.ts              # dry-run
 *   bun ../../packages/db/scripts/migrate-uploadthing.ts --execute    # for real
 *
 * Flags:
 *   --execute              actually write to Supabase + update DB rows
 *   --table=people|projects|teams|documents|all   (default: all)
 *   --limit=N              process at most N rows per table
 */

import { createClient } from "@supabase/supabase-js";
import { db } from "../src";

const EXECUTE = process.argv.includes("--execute");
const TABLE = process.argv.find((a) => a.startsWith("--table="))?.slice(8) ?? "all";
const LIMIT_RAW = process.argv.find((a) => a.startsWith("--limit="))?.slice(8);
const LIMIT = LIMIT_RAW ? Number(LIMIT_RAW) : undefined;

// UploadThing serves files from two host patterns:
//   - https://utfs.io/f/<key>           (legacy, shared host)
//   - https://<appId>.ufs.sh/f/<key>    (current, app-specific subdomain)
const UT_IMAGE_URL_FILTER = {
  OR: [{ imageUrl: { startsWith: "https://utfs.io" } }, { imageUrl: { contains: ".ufs.sh/" } }],
};
const UT_FILE_URL_FILTER = {
  OR: [{ fileUrl: { startsWith: "https://utfs.io" } }, { fileUrl: { contains: ".ufs.sh/" } }],
};

function req(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`\n  Missing env var: ${name}`);
    console.error(
      `  Run via: cd apps/web && bun run env:prod && bun ../../packages/db/scripts/migrate-uploadthing.ts\n`,
    );
    process.exit(1);
  }
  return v;
}

const supabase = createClient(req("NEXT_PUBLIC_SUPABASE_URL"), req("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

type Bucket = "images" | "documents";
type Result = {
  table: string;
  id: string;
  oldUrl: string;
  newPath?: string;
  error?: string;
};

const results: Result[] = [];

function extFromMime(mime: string): string | undefined {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
  };
  return map[mime.split(";")[0]?.trim() ?? ""];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function uploadOne(
  table: string,
  id: string,
  url: string,
  bucket: Bucket,
  preferredName?: string,
): Promise<Result> {
  const base: Result = { table, id, oldUrl: url };
  try {
    const res = await fetch(url);
    if (!res.ok) return { ...base, error: `fetch ${res.status}` };

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const blob = await res.blob();

    const urlName = url.split("/").pop()?.split("?")[0];
    const ext = extFromMime(contentType);
    const finalName = preferredName || urlName || (ext ? `file.${ext}` : "file");
    const path = `${crypto.randomUUID()}/${finalName}`;

    if (!EXECUTE) return { ...base, newPath: path };

    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType,
      upsert: false,
    });
    if (error) return { ...base, error: error.message };
    return { ...base, newPath: path };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : String(e) };
  }
}

function tick(status: "ok" | "err") {
  process.stdout.write(status === "ok" ? "." : "x");
}

async function migratePeople() {
  if (TABLE !== "all" && TABLE !== "people") return;
  const rows = await db.person.findMany({
    where: UT_IMAGE_URL_FILTER,
    select: { id: true, imageUrl: true, firstName: true, lastName: true },
    ...(LIMIT ? { take: LIMIT } : {}),
  });
  console.log(`\n→ people: ${rows.length} to migrate`);

  for (const r of rows) {
    if (!r.imageUrl) continue;
    const slug = slugify(`${r.firstName}-${r.lastName}`);
    const urlName = r.imageUrl.split("/").pop()?.split("?")[0] ?? "";
    const ext = urlName.includes(".") ? urlName.split(".").pop() : "jpg";
    const result = await uploadOne("person", r.id, r.imageUrl, "images", `${slug}.${ext}`);
    results.push(result);
    if (!result.error && result.newPath && EXECUTE) {
      await db.person.update({
        where: { id: r.id },
        data: { imageUrl: result.newPath },
      });
    }
    tick(result.error ? "err" : "ok");
  }
}

async function migrateProjects() {
  if (TABLE !== "all" && TABLE !== "projects") return;
  const rows = await db.project.findMany({
    where: UT_IMAGE_URL_FILTER,
    select: { id: true, imageUrl: true, name: true },
    ...(LIMIT ? { take: LIMIT } : {}),
  });
  console.log(`\n→ projects: ${rows.length} to migrate`);

  for (const r of rows) {
    if (!r.imageUrl) continue;
    const result = await uploadOne("project", r.id, r.imageUrl, "images", `${slugify(r.name)}.jpg`);
    results.push(result);
    if (!result.error && result.newPath && EXECUTE) {
      await db.project.update({
        where: { id: r.id },
        data: { imageUrl: result.newPath },
      });
    }
    tick(result.error ? "err" : "ok");
  }
}

async function migrateTeams() {
  if (TABLE !== "all" && TABLE !== "teams") return;
  const rows = await db.team.findMany({
    where: UT_IMAGE_URL_FILTER,
    select: { id: true, imageUrl: true, name: true },
    ...(LIMIT ? { take: LIMIT } : {}),
  });
  console.log(`\n→ teams: ${rows.length} to migrate`);

  for (const r of rows) {
    if (!r.imageUrl) continue;
    const result = await uploadOne("team", r.id, r.imageUrl, "images", `${slugify(r.name)}.jpg`);
    results.push(result);
    if (!result.error && result.newPath && EXECUTE) {
      await db.team.update({
        where: { id: r.id },
        data: { imageUrl: result.newPath },
      });
    }
    tick(result.error ? "err" : "ok");
  }
}

async function migrateDocuments() {
  if (TABLE !== "all" && TABLE !== "documents") return;
  const rows = await db.document.findMany({
    where: UT_FILE_URL_FILTER,
    select: { id: true, fileUrl: true, fileName: true },
    ...(LIMIT ? { take: LIMIT } : {}),
  });
  console.log(`\n→ documents: ${rows.length} to migrate`);

  for (const r of rows) {
    const result = await uploadOne("document", r.id, r.fileUrl, "documents", r.fileName);
    results.push(result);
    if (!result.error && result.newPath && EXECUTE) {
      await db.document.update({
        where: { id: r.id },
        data: { fileUrl: result.newPath },
      });
    }
    tick(result.error ? "err" : "ok");
  }
}

async function main() {
  console.log(
    `\n${EXECUTE ? "★ EXECUTING" : "✓ DRY-RUN"}   table=${TABLE}   limit=${LIMIT ?? "none"}`,
  );

  await migratePeople();
  await migrateProjects();
  await migrateTeams();
  await migrateDocuments();

  const ok = results.filter((r) => !r.error).length;
  const err = results.filter((r) => r.error).length;

  console.log(`\n\n─── summary ───`);
  console.log(`  migrated: ${ok}`);
  console.log(`  errors:   ${err}`);

  if (err > 0) {
    console.log(`\nerror detail:`);
    for (const r of results.filter((x) => x.error)) {
      console.log(`  [${r.table}/${r.id}] ${r.error}  (${r.oldUrl})`);
    }
  }

  if (!EXECUTE) {
    console.log(`\n(dry-run — rerun with --execute to actually migrate)`);
  } else {
    console.log(`\ndone.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
