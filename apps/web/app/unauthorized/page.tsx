import { Button } from "@workspace/ui/components/button";
import { ShieldX } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Access Denied" };

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-md px-6 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
          <ShieldX className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have permission to view this page. Contact your administrator if you believe
          this is a mistake.
        </p>
        <div className="mt-6">
          <Button asChild>
            <a href="/">Go home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
