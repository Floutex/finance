"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

import { cn } from "@/components/v2/primitives/utils"
import { Currency } from "@/components/v2/finance/currency"
import { ParticipantBadge } from "@/components/v2/finance/participant-badge"
import { ParticipantStack } from "@/components/v2/finance/participant-stack"
import { Checkbox } from "@/components/v2/primitives/checkbox"
import type { Tables } from "@/lib/database.types"
import type { Participant } from "@/lib/participants-cache"

type Transaction = Tables<"shared_transactions">

type TransactionCardProps = {
  transaction: Transaction
  participants: Participant[]
  selected?: boolean
  onSelect?: (next: boolean) => void
  onClick?: () => void
  rightSlot?: React.ReactNode
  className?: string
}

/**
 * Card representation of a transaction for mobile. Stacks the same data the
 * desktop table shows, prioritized: amount + description headline, then meta
 * (date · payer) and participants stack at the bottom.
 */
export function TransactionCard({
  transaction,
  participants,
  selected,
  onSelect,
  onClick,
  rightSlot,
  className,
}: TransactionCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "surface-1 flex items-start gap-3 rounded-xl p-3",
        onClick && "cursor-pointer hover:bg-accent/40",
        selected && "ring-1 ring-primary",
        className
      )}
    >
      {onSelect && (
        <div onClick={(e) => e.stopPropagation()} className="pt-1">
          <Checkbox
            checked={!!selected}
            onCheckedChange={(v) => onSelect(!!v)}
            aria-label="Selecionar"
          />
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {transaction.description?.trim() || "Sem descrição"}
          </p>
          <Currency
            value={transaction.amount ?? 0}
            className="shrink-0 text-sm font-medium"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {format(parseISO(transaction.date), "dd MMM", { locale: ptBR })}
          </span>
          <span aria-hidden>·</span>
          <ParticipantBadge
            name={transaction.paid_by}
            participants={participants}
          />
          {transaction.category?.trim() && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{transaction.category}</span>
            </>
          )}
        </div>
        {(transaction.participants?.length ?? 0) > 0 && (
          <ParticipantStack
            names={transaction.participants ?? []}
            participants={participants}
            size="xs"
            max={5}
          />
        )}
      </div>

      {rightSlot && (
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          {rightSlot}
        </div>
      )}
    </div>
  )
}
