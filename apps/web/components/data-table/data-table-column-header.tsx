"use client";

import type { Column } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
};

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-1 h-8", className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      <span>{title}</span>
      {column.getIsSorted() === "desc" ? (
        <ArrowDown className="ml-1 size-4" />
      ) : column.getIsSorted() === "asc" ? (
        <ArrowUp className="ml-1 size-4" />
      ) : (
        <ArrowUpDown className="ml-1 size-4" />
      )}
    </Button>
  );
}
