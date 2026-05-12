"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowUpRight, HandCoins, Loader2 } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import { Button } from "@/components/v2/primitives/button"
import { Currency } from "@/components/v2/finance/currency"
import { ParticipantAvatar } from "@/components/v2/finance/participant-avatar"
import type { Tables } from "@/lib/database.types"
import type { Participant } from "@/lib/participants-cache"

type Transaction = Tables<"shared_transactions">

type PendingRequestsProps = {
  requests: Transaction[]
  participants: Participant[]
  /** Map<id, pending state> — true while a particular row is being settled. */
  markingPaidIds: Set<string>
  onMarkPaid: (transaction: Transaction) => void
  onCreate: () => void
  className?: string
}

/**
 * Amber-tinted section above the transactions table listing cobranças pendentes
 * (transactions where `paid_by === PENDING_MARKER`). The current user can mark
 * each one as paid (becomes the actual payer) or open the RequestDialog to
 * create a new one.
 */
export function PendingRequests({
  requests,
  participants,
  markingPaidIds,
  onMarkPaid,
  onCreate,
  className,
}: PendingRequestsProps) {
  if (requests.length === 0) return null
  return (
    <section
      className={cn(
        "rounded-2xl border border-warning/30 bg-warning/5 p-5",
        className
      )}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HandCoins className="size-4 text-warning" />
          <h3 className="text-sm font-semibold text-warning">
            Solicitações pendentes
          </h3>
          <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning ring-1 ring-inset ring-warning/30 tabular-nums">
            {requests.length}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCreate}
          className="text-warning hover:bg-warning/10 hover:text-warning"
        >
          Nova solicitação
          <ArrowUpRight className="size-3.5" />
        </Button>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {requests.map((req) => {
          const requester = req.participants?.[0] ?? "Desconhecido"
          const isPending = markingPaidIds.has(req.id)
          return (
            <li
              key={req.id}
              className="surface-1 flex flex-col gap-3 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">
                    {req.description?.replace(/^💰\s*/, "") ?? "Sem descrição"}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ParticipantAvatar
                      name={requester}
                      participants={participants}
                      size="xs"
                    />
                    <span className="truncate">{requester}</span>
                    <span aria-hidden>•</span>
                    <span className="tabular-nums">
                      {format(parseISO(req.date), "dd MMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <Currency
                  value={req.amount ?? 0}
                  className="text-warning"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
                onClick={() => onMarkPaid(req)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Marcar como pago"
                )}
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
