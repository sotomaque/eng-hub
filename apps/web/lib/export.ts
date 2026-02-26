type Row = Record<string, unknown>;

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Exported for testing. Converts rows to a RFC-4180 CSV string. Returns "" for empty input. */
export function buildCsvContent(rows: Row[]): string {
  const [first] = rows;
  if (!first) return "";
  const headers = Object.keys(first);

  const csvEscape = (val: unknown): string => {
    const str = val === null || val === undefined ? "" : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
  ];

  return lines.join("\r\n");
}

export function downloadCsv(rows: Row[], filename: string): void {
  const content = buildCsvContent(rows);
  if (!content) return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

export function downloadJson(rows: Row[], filename: string): void {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  triggerDownload(blob, `${filename}.json`);
}

export async function downloadXlsx(rows: Row[], filename: string): Promise<void> {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
