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
  Briefcase,
  DollarSign,
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
import { FavoriteButton } from "@/components/favorite-button";
import { ModeToggle } from "@/components/mode-toggle";

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
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Health", icon: Activity, path: "/health" },
  { label: "People", icon: Users, path: "/team" },
  { label: "Org Chart", icon: Network, path: "/org-chart" },
  { label: "Roadmap", icon: Flag, path: "/roadmap" },
  { label: "Links", icon: LinkIcon, path: "/links" },
  { label: "Teams", icon: Layers, path: "/arrangements" },
  { label: "Billets", icon: Briefcase, path: "/billets" },
  { label: "Stats", icon: BarChart3, path: "/stats" },
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
              {navItems.map((item) => (
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
