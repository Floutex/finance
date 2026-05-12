"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"

import type { Tables } from "@/lib/database.types"
import type { Participant } from "@/lib/participants-cache"

import { Button } from "@/components/v2/primitives/button"
import { Badge } from "@/components/v2/primitives/badge"
import { Checkbox } from "@/components/v2/primitives/checkbox"
import { Currency } from "@/components/v2/finance/currency"
import { ParticipantBadge } from "@/components/v2/finance/participant-badge"
import { ParticipantStack } from "@/components/v2/finance/participant-stack"
import { DataTable } from "@/components/v2/data/data-table"

type Transaction = Tables<"shared_transactions">

const fmtDate = (iso: string) => {
  try {
    return format(parseISO(iso), "dd MMM", { locale: ptBR })
  } catch {
    return iso
  }
}

const fmtDateFull = (iso: string) => {
  try {
    return format(parseISO(iso), "dd 'de' MMMM, yyyy", { locale: ptBR })
  } catch {
    return iso
  }
}

function SortHeader({
  label,
  isSorted,
  onClick,
  align = "left",
}: {
  label: string
  isSorted: false | "asc" | "desc"
  onClick: () => void
  align?: "left" | "right"
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn_align(align, "-mx-2 h-7 gap-1 px-2 font-medium uppercase tracking-wider text-muted-foreground")}
    >
      {label}
      {isSorted === "asc" ? (
        <ArrowUp className="size-3" />
      ) : isSorted === "desc" ? (
        <ArrowDown className="size-3" />
      ) : (
        <ArrowUpDown className="size-3 opacity-50" />
      )}
    </Button>
  )
}

function cn_align(align: "left" | "right", base: string) {
  return align === "right" ? `${base} ml-auto justify-end text-right` : base
}

type TransactionsTableProps = {
  transactions: Transaction[]
  participants: Participant[]
  loading?: boolean
  /** Render an actions cell at the end of each row. */
  rowActions?: (transaction: Transaction) => React.ReactNode
  /** Row click handler. */
  onRowClick?: (transaction: Transaction) => void
  /** Enable a leading checkbox column. */
  enableSelection?: boolean
  /** Controlled selection state (keyed by transaction id). */
  rowSelection?: RowSelectionState
  onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>
  /** Items per page. Default 25. */
  pageSize?: number
  className?: string
}

export function TransactionsTable({
  transactions,
  participants,
  loading,
  rowActions,
  onRowClick,
  enableSelection = false,
  rowSelection,
  onRowSelectionChange,
  pageSize = 25,
  className,
}: TransactionsTableProps) {
  const columns = React.useMemo<ColumnDef<Transaction>[]>(() => {
    return [
      ...(enableSelection
        ? ([
            {
              id: "select",
              size: 36,
              header: ({ table }) => (
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected()
                      ? true
                      : table.getIsSomePageRowsSelected()
                      ? "indeterminate"
                      : false
                  }
                  onCheckedChange={(v) =>
                    table.toggleAllPageRowsSelected(!!v)
                  }
                  aria-label="Selecionar todas"
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(v) => row.toggleSelected(!!v)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Selecionar linha"
                />
              ),
              enableSorting: false,
            },
          ] as ColumnDef<Transaction>[])
        : []),
      {
        accessorKey: "date",
        size: 90,
        header: ({ column }) => (
          <SortHeader
            label="Data"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span
            className="text-xs text-muted-foreground tabular-nums"
            title={fmtDateFull(row.original.date)}
          >
            {fmtDate(row.original.date)}
          </span>
        ),
        sortingFn: (a, b) =>
          a.original.date < b.original.date ? -1 : a.original.date > b.original.date ? 1 : 0,
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <SortHeader
            label="Descrição"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="truncate font-medium">
              {row.original.description?.trim() || "Sem descrição"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "category",
        size: 140,
        header: "Categoria",
        cell: ({ row }) => {
          const c = row.original.category?.trim()
          if (!c) return <span className="text-xs text-muted-foreground">—</span>
          return (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {c}
            </Badge>
          )
        },
      },
      {
        accessorKey: "paid_by",
        size: 140,
        header: "Pago por",
        cell: ({ row }) => (
          <ParticipantBadge
            name={row.original.paid_by}
            participants={participants}
          />
        ),
      },
      {
        id: "participants",
        size: 130,
        header: "Participantes",
        cell: ({ row }) => (
          <ParticipantStack
            names={row.original.participants ?? []}
            participants={participants}
            size="xs"
            max={4}
          />
        ),
      },
      {
        accessorKey: "amount",
        size: 120,
        header: ({ column }) => (
          <SortHeader
            label="Valor"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            align="right"
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <Currency value={row.original.amount ?? 0} className="font-medium" />
          </div>
        ),
      },
      ...(rowActions
        ? ([
            {
              id: "actions",
              size: 56,
              header: "",
              cell: ({ row }) => (
                <div className="flex justify-end">{rowActions(row.original)}</div>
              ),
            },
          ] as ColumnDef<Transaction>[])
        : []),
    ]
  }, [participants, rowActions, enableSelection])

  return (
    <DataTable
      columns={columns}
      data={transactions}
      loading={loading}
      onRowClick={onRowClick}
      enableRowSelection={enableSelection}
      rowSelection={rowSelection}
      onRowSelectionChange={onRowSelectionChange}
      getRowId={(t) => t.id}
      pageSize={pageSize}
      empty="Nenhuma transação no período selecionado."
      footer={(table) => (
        <span>
          {table.getRowModel().rows.length} de{" "}
          {table.getCoreRowModel().rows.length} transações
        </span>
      )}
      pagination={(table) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <span className="px-1 tabular-nums">
            {table.getState().pagination.pageIndex + 1} /{" "}
            {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Próximo
          </Button>
        </div>
      )}
      className={className}
    />
  )
}
