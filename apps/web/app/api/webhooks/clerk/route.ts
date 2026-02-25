import { db } from "@workspace/api";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

type UserCreatedEvent = {
  type: "user.created";
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    public_metadata: Record<string, unknown>;
  };
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify the webhook signature
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let event: UserCreatedEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as UserCreatedEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "user.created") {
    return NextResponse.json({ received: true });
  }

  const clerkUserId = event.data.id;
  const email = event.data.email_addresses[0]?.email_address;

  // 1. Check publicMetadata.personId (set by direct invitations)
  let personId =
    typeof event.data.public_metadata.personId === "string"
      ? event.data.public_metadata.personId
      : null;

  // 2. If not found, look up PendingInvite by email
  if (!personId && email) {
    const pending = await db.pendingInvite.findUnique({
      where: { email },
      select: { personId: true },
    });
    if (pending) {
      personId = pending.personId;
    }
  }

  if (!personId) {
    return NextResponse.json({ received: true, linked: false });
  }

  // 3. Link the Person record
  try {
    await db.person.update({
      where: { id: personId },
      data: { clerkUserId },
    });
  } catch (e) {
    // P2025 = record not found, P2002 = unique constraint (already linked)
    const code = (e as { code?: string }).code;
    if (code !== "P2025" && code !== "P2002") throw e;
    return NextResponse.json({ received: true, linked: false });
  }

  // 4. Clean up the PendingInvite row if it existed
  if (email) {
    await db.pendingInvite.delete({ where: { email } }).catch((e: unknown) => {
      // P2025 = row already gone (expected when linked via publicMetadata)
      if ((e as { code?: string }).code !== "P2025") {
        console.error("[clerk-webhook] Failed to cleanup pending invite", e);
      }
    });
  }

  return NextResponse.json({ received: true, linked: true });
}
