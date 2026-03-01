"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { TitleColorMap } from "@/lib/constants/team";
import { TITLE_NO_TITLE_COLOR } from "@/lib/constants/team";
import { computeComposition } from "@/lib/team-composition";

type MemberWithTitle = {
  title: { name: string } | null;
};

type TeamCompositionBarProps = {
  members: MemberWithTitle[];
  titleColorMap: TitleColorMap;
  className?: string;
};

export function TeamCompositionBar({ members, titleColorMap, className }: TeamCompositionBarProps) {
  if (members.length === 0) return null;

  const entries = computeComposition(members, titleColorMap);
  const total = members.length;

  return (
    <div className={cn("flex h-1.5 w-full overflow-hidden rounded-full", className)}>
      {entries.map(([titleName, count]) => (
        <div
          key={titleName ?? "__none__"}
          style={{
            width: `${(count / total) * 100}%`,
            backgroundColor:
              titleName === null
                ? TITLE_NO_TITLE_COLOR
                : (titleColorMap.get(titleName) ?? TITLE_NO_TITLE_COLOR),
          }}
          title={`${titleName ?? "No title"}: ${count}`}
        />
      ))}
    </div>
  );
}
