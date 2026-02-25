import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
