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
  /** Server-side search: controlled input value */
  searchValue?: string;
  /** Server-side search: called on every keystroke */
  onSearchChange?: (value: string) => void;
}

export function DataTableToolbar<TData>({
  table,
  searchColumn = "title",
  searchPlaceholder = "Filter…",
  children,
  searchValue,
  onSearchChange,
}: DataTableToolbarProps<TData>) {
  const isServerSearch = onSearchChange !== undefined;
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    (isServerSearch && !!searchValue);

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={searchPlaceholder}
        value={
          isServerSearch
            ? (searchValue ?? "")
            : ((table.getColumn(searchColumn)?.getFilterValue() as string) ??
              "")
        }
        onChange={(event) => {
          if (isServerSearch) {
            onSearchChange(event.target.value);
          } else {
            table.getColumn(searchColumn)?.setFilterValue(event.target.value);
          }
        }}
        className="h-8 w-[150px] lg:w-[250px]"
      />
      {children}
      {isFiltered && (
        <Button
          variant="ghost"
          onClick={() => {
            table.resetColumnFilters();
            if (isServerSearch) onSearchChange("");
          }}
          className="h-8 px-2 lg:px-3"
        >
          Reset
          <X className="ml-2 size-4" />
        </Button>
      )}
    </div>
  );
}
