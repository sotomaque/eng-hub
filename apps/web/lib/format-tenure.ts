/**
 * Format a hire date into a short tenure string.
 *   <1 month  → "3w"
 *   <1 year   → "8mo"
 *   >=1 year  → "2.3y"
 */
export function formatTenure(hireDate: string | Date | null | undefined): string | null {
  if (!hireDate) return null;
  const start = typeof hireDate === "string" ? new Date(hireDate) : hireDate;
  if (Number.isNaN(start.getTime())) return null;

  const now = Date.now();
  const diffMs = now - start.getTime();
  if (diffMs < 0) return null;

  const days = diffMs / (1000 * 60 * 60 * 24);
  if (days < 30) {
    const weeks = Math.max(1, Math.round(days / 7));
    return `${weeks}w`;
  }

  const months = days / 30.44;
  if (months < 12) {
    return `${Math.round(months)}mo`;
  }

  const years = days / 365.25;
  return `${years.toFixed(1)}y`;
}
