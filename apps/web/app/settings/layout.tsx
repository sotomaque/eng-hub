import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { SettingsSidebar } from "@/components/settings-sidebar";
import { SettingsSiteHeader } from "@/components/settings-site-header";

export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <SettingsSidebar />
      <SidebarInset>
        <SettingsSiteHeader />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
