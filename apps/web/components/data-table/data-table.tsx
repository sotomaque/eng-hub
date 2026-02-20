"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  type Table as TanstackTable,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { ReactNode } from "react";
import { useState } from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  toolbar?: (table: TanstackTable<TData>) => ReactNode;
  /** Server-side pagination: total number of pages */
  pageCount?: number;
  /** Server-side pagination: current 0-based page index */
  pageIndex?: number;
  /** Server-side pagination: rows per page */
  pageSize?: number;
  /** Server-side pagination: called when page or pageSize changes */
  onPageChange?: (page: number, pageSize: number) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  pageCount: serverPageCount,
  pageIndex: serverPageIndex,
  pageSize: serverPageSize,
  onPageChange,
}: DataTableProps<TData, TValue>) {
  const isServerPagination = serverPageCount !== undefined;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: serverPageIndex ?? 0,
    pageSize: serverPageSize ?? 10,
  });

  // Render-time prop sync (no useEffect) — handles browser back/forward
  const [prevPageIndex, setPrevPageIndex] = useState(serverPageIndex);
  const [prevPageSize, setPrevPageSize] = useState(serverPageSize);
  if (
    isServerPagination &&
    (serverPageIndex !== prevPageIndex || serverPageSize !== prevPageSize)
  ) {
    setPrevPageIndex(serverPageIndex);
    setPrevPageSize(serverPageSize);
    setPagination({
      pageIndex: serverPageIndex ?? 0,
      pageSize: serverPageSize ?? 10,
    });
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(isServerPagination
      ? { manualPagination: true, pageCount: serverPageCount }
      : { getPaginationRowModel: getPaginationRowModel() }),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      setPagination(next);
      if (isServerPagination && onPageChange) {
        onPageChange(next.pageIndex + 1, next.pageSize);
      }
    },
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  });

  return (
    <div className="space-y-4">
      {toolbar?.(table)}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
