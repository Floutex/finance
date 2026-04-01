"use client"

import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/constants"
import { ArrowUpRight, HandCoins, Loader2 } from "lucide-react"
import type { Transaction } from "./types"

interface PendingRequestsProps {
  requests: Transaction[]
  markingPaidId: string | null
  onMarkAsPaid: (id: string) => void
  onOpenRequestDialog: () => void
}

export function PendingRequests({ requests, markingPaidId, onMarkAsPaid, onOpenRequestDialog }: PendingRequestsProps) {
  if (requests.length === 0) return null

  return (
    <section className="space-y-4 animate-slide-up-fade [animation-delay:750ms]">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-amber-400 animate-pulse" />
            <h3 className="text-lg font-semibold text-amber-400">Solicitações Pendentes</h3>
            <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500 ring-1 ring-inset ring-amber-500/20">
              {requests.length}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenRequestDialog}
            className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
          >
            Nova solicitação
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map(request => (
            <div
              key={request.id}
              className="group relative overflow-hidden rounded-xl border border-amber-500/20 bg-black/40 p-4 shadow-sm transition-all hover:border-amber-500/40 hover:shadow-md"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                  <p className="font-medium text-foreground truncate">{request.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>De: {(request.participants ?? [])[0] ?? "Desconhecido"}</span>
                    <span>•</span>
                    <span>{format(parseISO(request.date), "dd/MM")}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-400">{formatCurrency(request.amount ?? 0)}</p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => onMarkAsPaid(request.id)}
                disabled={markingPaidId === request.id}
                className="mt-3 w-full h-8 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20"
              >
                {markingPaidId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Marcar como Pago"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
