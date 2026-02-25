"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { TitleColorMap } from "@/lib/constants/team";
import { TITLE_NO_TITLE_COLOR } from "@/lib/constants/team";

interface MemberWithTitle {
  title: { name: string } | null;
}

interface TeamCompositionBarProps {
  members: MemberWithTitle[];
  titleColorMap: TitleColorMap;
  className?: string;
}

export function TeamCompositionBar({ members, titleColorMap, className }: TeamCompositionBarProps) {
  if (members.length === 0) return null;

  // Group members by title name
  const counts = new Map<string | null, number>();
  for (const m of members) {
    const key = m.title?.name ?? null;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Sort by titleColorMap insertion order (reflects sortOrder), null (no title) last
  const colorKeys = [...titleColorMap.keys()];
  const entries = [...counts.entries()].sort((a, b) => {
    if (a[0] === null) return 1;
    if (b[0] === null) return -1;
    return colorKeys.indexOf(a[0]) - colorKeys.indexOf(b[0]);
  });

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
