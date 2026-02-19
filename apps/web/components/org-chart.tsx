"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ChevronDown, ChevronRight, Network, Users } from "lucide-react";
import { useMemo, useState } from "react";

type ManagerInfo = {
  id: string;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
};

export type OrgMember = {
  id: string;
  personId: string;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
  managerId: string | null;
  manager: ManagerInfo | null;
  roleName: string | null;
  titleName: string | null;
};

type ManagerChange = {
  id: string;
  personId: string;
  person: { id: string; firstName: string; lastName: string };
  oldManagerId: string | null;
  newManagerId: string | null;
  oldManager: { id: string; firstName: string; lastName: string } | null;
  newManager: { id: string; firstName: string; lastName: string } | null;
  createdAt: Date;
};

interface OrgChartProps {
  members: OrgMember[];
  recentChanges: ManagerChange[];
  emptyMessage?: string;
}

interface TreeNode {
  member: OrgMember;
  children: TreeNode[];
}

function buildTree(members: OrgMember[]): {
  roots: TreeNode[];
  externalManagers: Map<string, { manager: ManagerInfo; children: TreeNode[] }>;
} {
  const nodeMap = new Map<string, TreeNode>();

  for (const m of members) {
    nodeMap.set(m.personId, { member: m, children: [] });
  }

  const roots: TreeNode[] = [];
  const externalManagers = new Map<
    string,
    { manager: ManagerInfo; children: TreeNode[] }
  >();

  for (const m of members) {
    const node = nodeMap.get(m.personId);
    if (!node) continue;
    const managerId = m.managerId;

    if (!managerId) {
      roots.push(node);
    } else if (nodeMap.has(managerId)) {
      nodeMap.get(managerId)?.children.push(node);
    } else if (m.manager) {
      // Manager exists but is not in this view
      if (!externalManagers.has(managerId)) {
        externalManagers.set(managerId, {
          manager: m.manager,
          children: [],
        });
      }
      externalManagers.get(managerId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return { roots, externalManagers };
}

function OrgNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const m = node.member;

  return (
    <div className={depth > 0 ? "ml-6 border-l pl-4" : ""}>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/50"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="flex size-5 shrink-0 items-center justify-center">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )
          ) : (
            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
          )}
        </div>
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={m.imageUrl ?? undefined} />
          <AvatarFallback className="text-xs">
            {m.firstName[0]}
            {m.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {m.firstName} {m.lastName}
          </span>
          <div className="flex items-center gap-1.5">
            {m.roleName && (
              <span className="truncate text-xs text-muted-foreground">
                {m.roleName}
              </span>
            )}
            {m.titleName && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {m.titleName}
              </Badge>
            )}
          </div>
        </div>
        {hasChildren && (
          <Badge
            variant="secondary"
            className="ml-auto text-[10px] px-1.5 py-0"
          >
            {node.children.length}
          </Badge>
        )}
      </button>
      {hasChildren && expanded && (
        <div className="mt-0.5">
          {node.children
            .sort((a, b) => a.member.lastName.localeCompare(b.member.lastName))
            .map((child) => (
              <OrgNode key={child.member.id} node={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

function ExternalManagerGroup({
  manager,
  reports,
}: {
  manager: ManagerInfo;
  reports: TreeNode[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-md border border-dashed p-2">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-2 py-1 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex size-5 shrink-0 items-center justify-center">
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>
        <Avatar className="size-8 shrink-0 opacity-60">
          <AvatarImage src={manager.imageUrl ?? undefined} />
          <AvatarFallback className="text-xs">
            {manager.firstName[0]}
            {manager.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-muted-foreground">
            {manager.firstName} {manager.lastName}
          </span>
          <span className="text-xs text-muted-foreground/70">
            External manager
          </span>
        </div>
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
          {reports.length}
        </Badge>
      </button>
      {expanded && (
        <div className="ml-6 mt-1 border-l pl-4">
          {reports
            .sort((a, b) => a.member.lastName.localeCompare(b.member.lastName))
            .map((child) => (
              <OrgNode key={child.member.id} node={child} depth={1} />
            ))}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

export function OrgChart({
  members,
  recentChanges,
  emptyMessage = "No team members yet. Add members from the Team page to see the org chart.",
}: OrgChartProps) {
  const { roots, externalManagers } = useMemo(
    () => buildTree(members),
    [members],
  );

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="size-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="size-5" />
            Organization Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {roots
              .sort((a, b) =>
                a.member.lastName.localeCompare(b.member.lastName),
              )
              .map((node) => (
                <OrgNode key={node.member.id} node={node} />
              ))}

            {Array.from(externalManagers.entries()).map(
              ([managerId, { manager, children: reports }]) => (
                <ExternalManagerGroup
                  key={managerId}
                  manager={manager}
                  reports={reports}
                />
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {recentChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <p>
                    <span className="font-medium">
                      {change.person.firstName} {change.person.lastName}
                    </span>{" "}
                    {change.oldManager && change.newManager ? (
                      <>
                        moved from{" "}
                        <span className="text-muted-foreground">
                          {change.oldManager.firstName}{" "}
                          {change.oldManager.lastName}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {change.newManager.firstName}{" "}
                          {change.newManager.lastName}
                        </span>
                      </>
                    ) : change.newManager ? (
                      <>
                        assigned to{" "}
                        <span className="font-medium">
                          {change.newManager.firstName}{" "}
                          {change.newManager.lastName}
                        </span>
                      </>
                    ) : change.oldManager ? (
                      <>
                        removed from{" "}
                        <span className="text-muted-foreground">
                          {change.oldManager.firstName}{" "}
                          {change.oldManager.lastName}
                        </span>
                      </>
                    ) : (
                      "manager updated"
                    )}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(change.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
