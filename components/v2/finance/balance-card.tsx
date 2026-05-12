import * as React from "react"

import { cn } from "@/components/v2/primitives/utils"
import { Currency } from "@/components/v2/finance/currency"

type BalanceCardProps = {
  /** Net balance: positive = receivable, negative = payable. */
  totalBalance: number
  className?: string
}

/**
 * Hero card: just the net balance with a status badge. Keeps it minimal —
 * the dashboard's metric cards row already covers period totals separately.
 */
export function BalanceCard({ totalBalance, className }: BalanceCardProps) {
  const status =
    totalBalance > 0.01
      ? { label: "A receber", tone: "success" as const }
      : totalBalance < -0.01
      ? { label: "A pagar", tone: "destructive" as const }
      : { label: "Tudo quitado", tone: "neutral" as const }

  return (
    <div
      className={cn(
        "surface-2 flex flex-col gap-3 rounded-2xl p-6",
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>Seu saldo</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            status.tone === "success" && "bg-success/15 text-success",
            status.tone === "destructive" &&
              "bg-destructive/15 text-destructive",
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
    </div>
  )
}
