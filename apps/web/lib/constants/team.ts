/**
 * Title-based color palette for team composition bars.
 * Titles are user-defined strings, so colors are assigned by
 * sorting unique titles alphabetically and indexing into this palette.
 */
export const TITLE_COLOR_PALETTE: string[] = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#f97316", // orange-500
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
];

export const TITLE_NO_TITLE_COLOR = "#9ca3af"; // gray-400

export type TitleColorMap = Map<string, string>;

/**
 * Build a stable title → hex color mapping.
 * Sorts unique title names alphabetically and assigns from palette by index.
 */
export function buildTitleColorMap(titleNames: string[]): TitleColorMap {
  const unique = [...new Set(titleNames)].sort();
  const map = new Map<string, string>();
  for (const [i, name] of unique.entries()) {
    map.set(
      name,
      TITLE_COLOR_PALETTE[i % TITLE_COLOR_PALETTE.length] ??
        TITLE_NO_TITLE_COLOR,
    );
  }
  return map;
}
