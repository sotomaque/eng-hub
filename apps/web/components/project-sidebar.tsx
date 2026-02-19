"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
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
  Activity,
  ArrowLeft,
  Flag,
  Layers,
  LayoutDashboard,
  Link as LinkIcon,
  Network,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";

interface ProjectSidebarProps {
  projectId: string;
  projectName: string;
  projectImageUrl?: string | null;
}

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Health", icon: Activity, path: "/health" },
  { label: "Team", icon: Users, path: "/team" },
  { label: "Org Chart", icon: Network, path: "/org-chart" },
  { label: "Roadmap", icon: Flag, path: "/roadmap" },
  { label: "Links", icon: LinkIcon, path: "/links" },
  { label: "Arrangements", icon: Layers, path: "/arrangements" },
];

export function ProjectSidebar({
  projectId,
  projectName,
  projectImageUrl,
}: ProjectSidebarProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  function isActive(itemPath: string) {
    const fullPath = `${basePath}${itemPath}`;
    if (itemPath === "") {
      return pathname === basePath;
    }
    return pathname.startsWith(fullPath);
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={basePath}>
                <Avatar className="size-8 shrink-0 rounded-md">
                  <AvatarImage src={projectImageUrl ?? undefined} />
                  <AvatarFallback className="rounded-md text-sm">
                    {projectName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{projectName}</span>
                  <span className="text-muted-foreground text-xs">Project</span>
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
                <span>Back to Projects</span>
              </Link>
            </SidebarMenuButton>
            <ModeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
