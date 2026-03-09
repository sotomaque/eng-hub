"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTRPC } from "@/lib/trpc/client";

type AccessData = {
  personId: string;
  capabilities: string[];
  projectCapabilities: Record<string, string[]>;
  isAdmin: boolean;
};

export function useAccess() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.access.myAccess.queryOptions());

  return useMemo(() => {
    const access = data as AccessData | undefined;
    const globalCaps = new Set(access?.capabilities ?? []);
    const projectCaps = access?.projectCapabilities ?? {};

    function can(capability: string, projectId?: string): boolean {
      if (!access) return false;
      if (access.isAdmin) return true;
      if (globalCaps.has(capability)) return true;
      if (projectId && projectCaps[projectId]) {
        return projectCaps[projectId].includes(capability);
      }
      return false;
    }

    return {
      can,
      isAdmin: access?.isAdmin ?? false,
      isLoading,
      personId: access?.personId ?? null,
    };
  }, [data, isLoading]);
}
