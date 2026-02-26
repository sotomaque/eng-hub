"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import {
  ArrowLeft,
  FileText,
  LayoutDashboard,
  NotebookPen,
  Share2,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";

type MeSidebarProps = {
  personName: string;
  personImageUrl?: string | null;
};

const navItems = [
  { label: "Profile", icon: LayoutDashboard, path: "" },
  { label: "Direct Reports", icon: Users, path: "/direct-reports" },
  { label: "Goals", icon: Target, path: "/goals" },
  { label: "1:1 Meetings", icon: NotebookPen, path: "/one-on-ones" },
  { label: "Templates", icon: FileText, path: "/templates" },
  { label: "Sharing", icon: Share2, path: "/sharing" },
];

export function MeSidebar({ personName, personImageUrl }: MeSidebarProps) {
  const pathname = usePathname();
  const basePath = "/me";

  function isActive(itemPath: string) {
    const fullPath = `${basePath}${itemPath}`;
    if (itemPath === "") {
      return pathname === basePath;
    }
    return pathname.startsWith(fullPath);
  }

  const initials = personName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={basePath}>
                <Avatar className="size-8 shrink-0 rounded-full">
                  <AvatarImage src={personImageUrl ?? undefined} />
                  <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{personName}</span>
                  <span className="text-muted-foreground text-xs">My Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={isActive(item.path)}>
                    <Link href={`${basePath}${item.path}`}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between">
            <SidebarMenuButton asChild>
              <Link href="/">
                <ArrowLeft />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
            <ModeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
