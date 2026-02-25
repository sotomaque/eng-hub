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
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Fragment, type ReactNode, useState } from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";

type DataTableProps<TData, TValue> = {
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
  /** Server-side sorting: current sort column id */
  sortBy?: string;
  /** Server-side sorting: current sort direction */
  sortOrder?: "asc" | "desc";
  /** Server-side sorting: called when sorting changes */
  onSortingChange?: (sortBy: string | undefined, sortOrder: "asc" | "desc") => void;
  /** Initial column visibility (e.g. { multiProject: false }) */
  initialColumnVisibility?: VisibilityState;
  /** ID accessor for each data row, used for drag-and-drop integration */
  getRowId?: (originalRow: TData, index: number) => string;
  /** Custom row wrapper, e.g. for drag-and-drop sortable rows */
  renderRow?: (props: { rowId: string; children: ReactNode }) => ReactNode;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  pageCount: serverPageCount,
  pageIndex: serverPageIndex,
  pageSize: serverPageSize,
  onPageChange,
  sortBy: serverSortBy,
  sortOrder: serverSortOrder,
  onSortingChange: onServerSortingChange,
  initialColumnVisibility,
  getRowId,
  renderRow,
}: DataTableProps<TData, TValue>) {
  const isServerPagination = serverPageCount !== undefined;
  const isServerSorting = onServerSortingChange !== undefined;

  const initialSorting: SortingState = serverSortBy
    ? [{ id: serverSortBy, desc: serverSortOrder === "desc" }]
    : [];
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility ?? {},
  );
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

  // Sync server sort state on prop change (browser back/forward)
  const [prevSortBy, setPrevSortBy] = useState(serverSortBy);
  const [prevSortOrder, setPrevSortOrder] = useState(serverSortOrder);
  if (isServerSorting && (serverSortBy !== prevSortBy || serverSortOrder !== prevSortOrder)) {
    setPrevSortBy(serverSortBy);
    setPrevSortOrder(serverSortOrder);
    setSorting(serverSortBy ? [{ id: serverSortBy, desc: serverSortOrder === "desc" }] : []);
  }

  const table = useReactTable({
    data,
    columns,
    ...(getRowId ? { getRowId } : {}),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(isServerSorting ? { manualSorting: true } : { getSortedRowModel: getSortedRowModel() }),
    ...(isServerPagination
      ? { manualPagination: true, pageCount: serverPageCount }
      : { getPaginationRowModel: getPaginationRowModel() }),
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      if (isServerSorting) {
        const col = next[0];
        onServerSortingChange(col?.id, col?.desc ? "desc" : "asc");
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      setPagination(next);
      if (isServerPagination && onPageChange) {
        onPageChange(next.pageIndex + 1, next.pageSize);
      }
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
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
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const cells = row
                  .getVisibleCells()
                  .map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ));
                if (renderRow) {
                  return (
                    <Fragment key={row.id}>
                      {renderRow({ rowId: row.id, children: cells })}
                    </Fragment>
                  );
                }
                return <TableRow key={row.id}>{cells}</TableRow>;
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
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
