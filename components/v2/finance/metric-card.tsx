import * as React from "react"
import { cn } from "@/components/v2/primitives/utils"
import { Currency } from "@/components/v2/finance/currency"

type MetricCardProps = {
  label: string
  /** Numeric value formatted as BRL currency. Mutually exclusive with `children`. */
  value?: number
  /** Secondary line (e.g. comparison vs previous period). */
  hint?: React.ReactNode
  /** Trend indicator — colors and arrows the hint. */
  trend?: "up" | "down" | "neutral"
  /** Optional icon shown top-right. */
  icon?: React.ReactNode
  /** Sign-color the main value (positive → success, negative → destructive). */
  signed?: boolean
  /** Render arbitrary content in place of the formatted value. */
  children?: React.ReactNode
  className?: string
}

/**
 * Top-of-page metric tile. Hero typographic number, label above, contextual
 * hint below. Used in clusters of 3–4 on dashboards.
 */
export function MetricCard({
  label,
  value,
  hint,
  trend,
  icon,
  signed = false,
  children,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        // h-full + the parent grid's items-stretch keeps every card at the
        // same height regardless of content length.
        "surface-1 flex h-full flex-col gap-3 rounded-xl p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className="text-muted-foreground [&>svg]:size-4">{icon}</span>
        )}
      </div>
      <div className="flex min-h-[2.25rem] items-baseline gap-2">
        {children ?? (
          typeof value === "number" ? (
            <Currency value={value} display signed={signed} />
          ) : (
            <span className="font-display text-3xl font-semibold text-muted-foreground">—</span>
          )
        )}
      </div>
      {hint && (
        <div
          className={cn(
            "mt-auto text-xs",
            trend === "up" && "text-success",
            trend === "down" && "text-destructive",
            (!trend || trend === "neutral") && "text-muted-foreground"
          )}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
