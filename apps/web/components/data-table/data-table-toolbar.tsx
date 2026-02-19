"use client";

import type { Table } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchColumn?: string;
  searchPlaceholder?: string;
  children?: ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  searchColumn = "title",
  searchPlaceholder = "Filter...",
  children,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={searchPlaceholder}
        value={
          (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""
        }
        onChange={(event) =>
          table.getColumn(searchColumn)?.setFilterValue(event.target.value)
        }
        className="h-8 w-[150px] lg:w-[250px]"
      />
      {children}
      {isFiltered && (
        <Button
          variant="ghost"
          onClick={() => table.resetColumnFilters()}
          className="h-8 px-2 lg:px-3"
        >
          Reset
          <X className="ml-2 size-4" />
        </Button>
      )}
    </div>
  );
}
