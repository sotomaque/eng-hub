import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminInviteForm } from "@/components/admin-invite-form";
import { AdminWaitlistTable } from "@/components/admin-waitlist-table";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage waitlist entries and send invitations.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Waitlist</h2>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading waitlist...</p>}>
          <AdminWaitlistTable />
        </Suspense>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Send Invitation</h2>
        <AdminInviteForm />
      </section>
    </div>
  );
}
