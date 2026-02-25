import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar";
import { redirect } from "next/navigation";
import { MeSidebar } from "@/components/me-sidebar";
import { MeSiteHeader } from "@/components/me-site-header";
import { getMe } from "./_lib/queries";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: React.ReactNode;
};

export default async function MeLayout({ children }: LayoutProps) {
  const person = await getMe();

  if (!person) {
    redirect("/people");
  }

  const fullName = `${person.firstName} ${person.lastName}`;

  return (
    <SidebarProvider>
      <MeSidebar personName={fullName} personImageUrl={person.imageUrl} />
      <SidebarInset>
        <MeSiteHeader />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
