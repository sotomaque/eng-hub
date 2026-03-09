import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { AppHeader } from "@/components/app-header";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: LayoutProps) {
  const trpc = await createServerCaller();
  const access = await trpc.access.myAccess();

  if (!access.isAdmin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav />
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
