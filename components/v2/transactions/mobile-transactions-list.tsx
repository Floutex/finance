"use client"

import * as React from "react"

import { cn } from "@/components/v2/primitives/utils"
import { Button } from "@/components/v2/primitives/button"
import { Skeleton } from "@/components/v2/primitives/skeleton"
import { TransactionCard } from "@/components/v2/transactions/transaction-card"
import type { Tables } from "@/lib/database.types"
import type { Participant } from "@/lib/participants-cache"

type Transaction = Tables<"shared_transactions">

type MobileTransactionsListProps = {
  transactions: Transaction[]
  participants: Participant[]
  loading?: boolean
  /** Selection by id. */
  selection: Record<string, boolean>
  onToggleSelect: (id: string, next: boolean) => void
  onRowClick?: (transaction: Transaction) => void
  rowRight?: (transaction: Transaction) => React.ReactNode
  pageSize?: number
  className?: string
}

/**
 * Card-based listing for mobile, replacing the TransactionsTable below `md`.
 * Pagination is "load more" since infinite-scroll requires more plumbing than
 * we need here.
 */
export function MobileTransactionsList({
  transactions,
  participants,
  loading,
  selection,
  onToggleSelect,
  onRowClick,
  rowRight,
  pageSize = 20,
  className,
}: MobileTransactionsListProps) {
  const [visible, setVisible] = React.useState(pageSize)
  React.useEffect(() => setVisible(pageSize), [pageSize, transactions.length])
  const slice = transactions.slice(0, visible)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {loading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))
      ) : transactions.length === 0 ? (
        <div className="surface-1 rounded-xl px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma transação no período selecionado.
        </div>
      ) : (
        <>
          {slice.map((t) => (
            <TransactionCard
              key={t.id}
              transaction={t}
              participants={participants}
              selected={!!selection[t.id]}
              onSelect={(next) => onToggleSelect(t.id, next)}
              onClick={onRowClick ? () => onRowClick(t) : undefined}
              rightSlot={rowRight?.(t)}
            />
          ))}
          {visible < transactions.length && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setVisible((v) => v + pageSize)}
              className="self-center"
            >
              Carregar mais ({transactions.length - visible} restantes)
            </Button>
          )}
        </>
      )}
    </div>
  )
}
