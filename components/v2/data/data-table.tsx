"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Table as TableInstance,
} from "@tanstack/react-table"

import { cn } from "@/components/v2/primitives/utils"
import { Skeleton } from "@/components/v2/primitives/skeleton"

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Slot above the table — typically a `DataTableToolbar`. Receives the table instance. */
  toolbar?: (table: TableInstance<TData>) => React.ReactNode
  /** Slot below the table — typically a `DataTablePagination`. Receives the table instance. */
  pagination?: (table: TableInstance<TData>) => React.ReactNode
  /** Bottom-left summary slot (e.g. selection count). Receives the table. */
  footer?: (table: TableInstance<TData>) => React.ReactNode
  /** Click handler for body rows. */
  onRowClick?: (row: TData) => void
  /** Show skeleton rows. */
  loading?: boolean
  /** Skeleton row count. Default 8. */
  skeletonRows?: number
  /** Custom empty state. */
  empty?: React.ReactNode
  /** Enable row selection (checkbox column should be defined in `columns`). */
  enableRowSelection?: boolean
  /** Controlled row selection. If provided alongside `onRowSelectionChange`,
   *  the table runs in controlled mode. */
  rowSelection?: RowSelectionState
  onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>
  /** Stable row id accessor — defaults to `(row as any).id`. */
  getRowId?: (row: TData) => string
  /** Initial page size for client-side pagination. Default 25. */
  pageSize?: number
  className?: string
}

/**
 * Generic, headless-style data table backed by TanStack Table.
 *
 * Designed as the single primitive for any tabular surface in v2
 * (transactions, audit log, categories, participants, etc.). Columns,
 * row models, and rendering live with the consumer; this only wires the
 * table instance and provides a consistent layout.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  pagination,
  footer,
  onRowClick,
  loading = false,
  skeletonRows = 8,
  empty,
  enableRowSelection = false,
  rowSelection: rowSelectionProp,
  onRowSelectionChange: onRowSelectionChangeProp,
  getRowId,
  pageSize = 25,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [internalRowSelection, setInternalRowSelection] =
    React.useState<RowSelectionState>({})
  const rowSelection = rowSelectionProp ?? internalRowSelection
  const setRowSelection = onRowSelectionChangeProp ?? setInternalRowSelection

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: getRowId,
    initialState: { pagination: { pageSize } },
  })

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {toolbar?.(table)}

      <div className="surface-1 overflow-hidden rounded-xl">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b border-border [&_tr]:border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.column.columnDef.size }}
                      className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground [&:has([role=checkbox])]:pr-0"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-border last:border-0">
                    {table.getAllLeafColumns().map((col) => (
                      <td key={col.id} className="px-3 py-2.5">
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getAllLeafColumns().length}
                    className="h-32 px-3 text-center text-sm text-muted-foreground"
                  >
                    {empty ?? "Nada para mostrar"}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      "border-b border-border transition-colors last:border-0 hover:bg-muted/40",
                      onRowClick && "cursor-pointer",
                      row.getIsSelected() && "bg-muted/60"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-3 py-2.5 align-middle [&:has([role=checkbox])]:pr-0"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(footer || pagination) && (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>{footer?.(table)}</div>
          <div>{pagination?.(table)}</div>
        </div>
      )}
    </div>
  )
}
