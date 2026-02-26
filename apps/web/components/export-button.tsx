"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Download, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { downloadCsv, downloadJson, downloadXlsx } from "@/lib/export";

type ExportButtonProps = {
  filename: string;
  fetchData: () => Promise<Record<string, unknown>[]>;
  disabled?: boolean;
};

export function ExportButton({ filename, fetchData, disabled }: ExportButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleExport = (format: "xlsx" | "csv" | "json") => {
    startTransition(async () => {
      try {
        const rows = await fetchData();
        if (format === "xlsx") {
          await downloadXlsx(rows, filename);
        } else if (format === "csv") {
          downloadCsv(rows, filename);
        } else {
          downloadJson(rows, filename);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Export failed");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8" disabled={disabled || isPending}>
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={isPending} onSelect={() => handleExport("xlsx")}>
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isPending} onSelect={() => handleExport("csv")}>
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isPending} onSelect={() => handleExport("json")}>
          JSON (.json)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
