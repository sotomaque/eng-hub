import { resetAndSeed } from "@workspace/api";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<Response> {
  // Guard 1: Only available on Vercel preview deployments
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Guard 2: Require shared secret
  const secret = process.env.E2E_RESET_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "E2E_RESET_SECRET is not configured" }, { status: 500 });
  }

  const token = request.headers.get("x-e2e-reset-token");
  if (token !== secret) {
    return NextResponse.json({ error: "Invalid or missing reset token" }, { status: 401 });
  }

  try {
    await resetAndSeed();
    return NextResponse.json({
      ok: true,
      message: "Database reset and seeded",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[e2e/reset] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
