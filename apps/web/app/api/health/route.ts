import { db } from "@workspace/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error", reason: "database unreachable" }, { status: 503 });
  }
}
