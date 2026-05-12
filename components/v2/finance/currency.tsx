import * as React from "react"
import { cn } from "@/components/v2/primitives/utils"
import { formatCurrency } from "@/lib/v2/tokens"

type CurrencyProps = {
  value: number
  /** Colors negative values red. Default false (sign is shown via `-` prefix). */
  signed?: boolean
  /** Editorial display style — larger, tighter tracking, OpenType lining. */
  display?: boolean
  /** Hide the currency symbol (just the numeric part, tabular). */
  compact?: boolean
  className?: string
}

/**
 * `<Currency value={42.5} />` — single source of truth for displaying monetary
 * values in v2. Always tabular-nums; PT-BR / BRL formatting; optional editorial
 * variant for hero numbers (metric cards, balance headers).
 */
export function Currency({
  value,
  signed = false,
  display = false,
  compact = false,
  className,
}: CurrencyProps) {
  const negative = value < 0
  const formatted = compact
    ? new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Math.abs(value))
    : formatCurrency(Math.abs(value))

  return (
    <span
      className={cn(
        "tabular-nums",
        display && "font-display text-3xl font-semibold",
        signed && negative && "text-destructive",
        signed && !negative && value > 0 && "text-success",
        className
      )}
    >
      {negative ? "−" : signed && value > 0 ? "+" : ""}
      {formatted}
    </span>
  )
}
