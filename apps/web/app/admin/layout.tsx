import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: LayoutProps) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  if (role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
