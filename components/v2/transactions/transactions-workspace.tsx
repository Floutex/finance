"use client"

import * as React from "react"
import type { RowSelectionState } from "@tanstack/react-table"

import type { Tables } from "@/lib/database.types"
import type { Participant } from "@/lib/participants-cache"

import { TransactionsTable } from "@/components/v2/transactions/transactions-table"
import {
  TransactionsToolbar,
  type TransactionsToolbarValue,
} from "@/components/v2/transactions/transactions-toolbar"
import { MobileTransactionsList } from "@/components/v2/transactions/mobile-transactions-list"
import { MobileFiltersSheet } from "@/components/v2/transactions/mobile-filters-sheet"

type Transaction = Tables<"shared_transactions">

export type TransactionsWorkspaceProps = {
  transactions: Transaction[]
  participants: Participant[]
  toolbar: TransactionsToolbarValue
  onToolbarChange: (next: TransactionsToolbarValue) => void
  /** Disable quick-range chips when there's not enough data yet. */
  disabledQuickRange?: boolean
  /** Optional row actions cell (admin shows edit/delete; guest hides). */
  rowActions?: (transaction: Transaction) => React.ReactNode
  /** Enable a leading checkbox column on the desktop table. */
  enableSelection?: boolean
  rowSelection?: RowSelectionState
  onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>
  /** Click handler for mobile rows / optionally desktop. */
  onRowClick?: (transaction: Transaction) => void
  /** Optional subheading rendered above the toolbar (admin's /dashboard uses it). */
  heading?: React.ReactNode
  /** Items per page. Default 25. */
  pageSize?: number
  mobilePageSize?: number
}

/**
 * Filtered transactions block — toolbar + responsive table/list. Shared between
 * the admin and guest shells; opt-in to selection/row-actions via props.
 */
export function TransactionsWorkspace({
  transactions,
  participants,
  toolbar,
  onToolbarChange,
  disabledQuickRange,
  rowActions,
  enableSelection,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  heading,
  pageSize,
  mobilePageSize,
}: TransactionsWorkspaceProps) {
  const mobileSelection = (rowSelection ?? {}) as Record<string, boolean>
  const handleMobileToggle = React.useCallback(
    (id: string, next: boolean) => {
      if (!onRowSelectionChange) return
      onRowSelectionChange((prev) => {
        const out = { ...prev }
        if (next) out[id] = true
        else delete out[id]
        return out
      })
    },
    [onRowSelectionChange]
  )

  return (
    <section className="flex flex-col gap-3">
      {heading}
      <div className="flex items-center justify-between gap-2">
        <TransactionsToolbar
          value={toolbar}
          onChange={onToolbarChange}
          disabledQuickRange={disabledQuickRange}
          className="flex-1"
        />
        <MobileFiltersSheet value={toolbar} onChange={onToolbarChange} />
      </div>
      <div className="hidden md:block">
        <TransactionsTable
          transactions={transactions}
          participants={participants}
          enableSelection={enableSelection}
          rowSelection={rowSelection}
          onRowSelectionChange={onRowSelectionChange}
          rowActions={rowActions}
          onRowClick={onRowClick}
          pageSize={pageSize}
        />
      </div>
      <div className="md:hidden">
        <MobileTransactionsList
          transactions={transactions}
          participants={participants}
          selection={mobileSelection}
          onToggleSelect={handleMobileToggle}
          onRowClick={onRowClick}
          pageSize={mobilePageSize}
        />
      </div>
    </section>
  )
}
