import * as React from "react"
import { ArrowRight } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import { Currency } from "@/components/v2/finance/currency"
import { ParticipantAvatar } from "@/components/v2/finance/participant-avatar"

type DebtLine = { from: string; to: string; amount: number }

type BalanceCardProps = {
  currentUser: string
  /** Net balance: positive = receivable, negative = payable. */
  totalBalance: number
  /** Simplified debts that include the current user. */
  myDebts: DebtLine[]
  participants?: { name: string; color: string }[] | null
  className?: string
}

/**
 * Hero card: net balance for the user + a short list of who-owes-whom
 * relative to them. Sits at the top of the dashboard, full width.
 */
export function BalanceCard({
  currentUser,
  totalBalance,
  myDebts,
  participants,
  className,
}: BalanceCardProps) {
  const owed = myDebts.filter((d) => d.to === currentUser)
  const owes = myDebts.filter((d) => d.from === currentUser)

  const status =
    totalBalance > 0.01
      ? { label: "A receber", tone: "success" as const }
      : totalBalance < -0.01
      ? { label: "A pagar", tone: "destructive" as const }
      : { label: "Tudo quitado", tone: "neutral" as const }

  return (
    <div
      className={cn(
        "surface-2 grid gap-6 rounded-2xl p-6 md:grid-cols-[1fr_1.4fr] md:gap-10",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>Seu saldo</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              status.tone === "success" && "bg-success/15 text-success",
              status.tone === "destructive" && "bg-destructive/15 text-destructive",
              status.tone === "neutral" && "bg-muted text-muted-foreground"
            )}
          >
            {status.label}
          </span>
        </div>
        <Currency
          value={totalBalance}
          display
          signed
          className="text-5xl md:text-6xl"
        />
        <p className="text-xs text-muted-foreground">
          Balanço líquido após simplificação de dívidas entre participantes.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <DebtList
          title="Você recebe de"
          empty="Ninguém te deve nada agora."
          lines={owed}
          who="from"
          participants={participants}
          tone="success"
        />
        <DebtList
          title="Você deve a"
          empty="Você não deve nada agora."
          lines={owes}
          who="to"
          participants={participants}
          tone="destructive"
        />
      </div>
    </div>
  )
}

function DebtList({
  title,
  empty,
  lines,
  who,
  participants,
  tone,
}: {
  title: string
  empty: string
  lines: DebtLine[]
  who: "from" | "to"
  participants?: { name: string; color: string }[] | null
  tone: "success" | "destructive"
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {lines.length === 0 ? (
        <div className="text-xs text-muted-foreground">{empty}</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {lines.map((d, i) => {
            const counterpart = d[who]
            return (
              <li
                key={`${d.from}-${d.to}-${i}`}
                className="flex items-center gap-3 rounded-md border border-border bg-background/60 px-3 py-2"
              >
                <ParticipantAvatar
                  name={counterpart}
                  participants={participants}
                  size="xs"
                />
                <span className="text-sm font-medium">{counterpart}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <Currency
                  value={d.amount}
                  className={cn(
                    "ml-auto text-sm font-semibold",
                    tone === "success" && "text-success",
                    tone === "destructive" && "text-destructive"
                  )}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
