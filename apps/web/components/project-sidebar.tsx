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
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Briefcase,
  DollarSign,
  FileText,
  Flag,
  FolderUp,
  Layers,
  LayoutDashboard,
  Link as LinkIcon,
  Network,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { FavoriteButton } from "@/components/favorite-button";
import { ModeToggle } from "@/components/mode-toggle";
import { useAccess } from "@/lib/hooks/use-access";

type ProjectSidebarProps = {
  projectId: string;
  projectName: string;
  projectImageUrl?: string | null;
  parentProject?: { id: string; name: string; imageUrl: string | null } | null;
  fundedByProject?: { id: string; name: string } | null;
  owners?: {
    id: string;
    firstName: string;
    lastName: string;
    imageUrl: string | null;
  }[];
  isFavorited?: boolean;
};

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "", capability: null },
  { label: "Health", icon: Activity, path: "/health", capability: "project:health:read" },
  { label: "People", icon: Users, path: "/team", capability: "project:team:read" },
  { label: "Org Chart", icon: Network, path: "/org-chart", capability: "project:team:read" },
  { label: "Roadmap", icon: Flag, path: "/roadmap", capability: "project:roadmap:read" },
  { label: "Links", icon: LinkIcon, path: "/links", capability: "project:links:read" },
  { label: "Documents", icon: FileText, path: "/documents", capability: "project:documents:read" },
  { label: "Teams", icon: Layers, path: "/arrangements", capability: "project:arrangements:read" },
  { label: "Billets", icon: Briefcase, path: "/billets", capability: "project:budget:read" },
  { label: "Stats", icon: BarChart3, path: "/stats", capability: "project:stats:read" },
  { label: "Glossary", icon: BookOpen, path: "/glossary", capability: "project:glossary:read" },
];

export function ProjectSidebar({
  projectId,
  projectName,
  projectImageUrl,
  parentProject,
  fundedByProject,
  owners,
  isFavorited,
}: ProjectSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/projects/${projectId}`;
  const { can } = useAccess();

  const visibleItems = useMemo(
    () => navItems.filter((item) => !item.capability || can(item.capability, projectId)),
    [can, projectId],
  );

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
            <div className="flex items-center gap-1">
              <SidebarMenuButton size="lg" asChild className="flex-1">
                <Link href={basePath}>
                  <Avatar className="size-8 shrink-0 rounded-md">
                    <AvatarImage src={projectImageUrl ?? undefined} />
                    <AvatarFallback className="rounded-md text-sm">{projectName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">{projectName}</span>
                    <span className="text-muted-foreground text-xs">Project</span>
                  </div>
                </Link>
              </SidebarMenuButton>
              <FavoriteButton projectId={projectId} isFavorited={isFavorited ?? false} />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {parentProject && (
          <SidebarGroup>
            <SidebarGroupLabel>Parent Project</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      href={`/projects/${parentProject.id}`}
                      onMouseEnter={() => router.prefetch(`/projects/${parentProject.id}`)}
                    >
                      <FolderUp />
                      <span>{parentProject.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {fundedByProject && (
          <SidebarGroup>
            <SidebarGroupLabel>Funded By</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      href={`/projects/${fundedByProject.id}`}
                      onMouseEnter={() => router.prefetch(`/projects/${fundedByProject.id}`)}
                    >
                      <DollarSign />
                      <span>{fundedByProject.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {owners && owners.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{owners.length === 1 ? "Owner" : "Owners"}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {owners.map((owner) => (
                  <SidebarMenuItem key={owner.id}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={`/people/${owner.id}`}
                        onMouseEnter={() => router.prefetch(`/people/${owner.id}`)}
                      >
                        <Avatar className="size-5 shrink-0">
                          <AvatarImage src={owner.imageUrl ?? undefined} />
                          <AvatarFallback className="text-[8px]">
                            {owner.firstName[0]}
                            {owner.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {owner.firstName} {owner.lastName}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={isActive(item.path)}>
                    <Link
                      href={`${basePath}${item.path}`}
                      onMouseEnter={() => router.prefetch(`${basePath}${item.path}`)}
                    >
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
