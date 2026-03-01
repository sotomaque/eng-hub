import type { TitleColorMap } from "@/lib/constants/team";

type MemberWithTitle = {
  title: { name: string } | null;
};

type CompositionEntry = [titleName: string | null, count: number];

/**
 * Group members by title name, then sort by the title color map's insertion
 * order (which reflects the title's sortOrder). Null titles sort last.
 */
export function computeComposition(
  members: MemberWithTitle[],
  titleColorMap: TitleColorMap,
): CompositionEntry[] {
  const counts = new Map<string | null, number>();
  for (const m of members) {
    const key = m.title?.name ?? null;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const colorKeys = [...titleColorMap.keys()];
  return [...counts.entries()].sort((a, b) => {
    if (a[0] === null) return 1;
    if (b[0] === null) return -1;
    return colorKeys.indexOf(a[0]) - colorKeys.indexOf(b[0]);
  });
}
