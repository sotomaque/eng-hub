import { getServerSession } from "@workspace/auth/server";
import type { PresignRequest } from "@workspace/storage";
import { createPresignedUpload } from "@workspace/storage/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await getServerSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: PresignRequest = await request.json();
  const { bucket, fileName } = body;

  try {
    const result = await createPresignedUpload(bucket, fileName);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create presigned URL" },
      { status: 500 },
    );
  }
}
