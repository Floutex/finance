import * as React from "react"
import { cn } from "@/components/v2/primitives/utils"

type ChartTooltipProps = {
  title?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Shared tooltip shell for recharts and SVG charts in v2. Plain card with a
 * small title and arbitrary content. Keeps tooltips visually consistent across
 * balance/category/etc.
 */
export function ChartTooltip({ title, className, children }: ChartTooltipProps) {
  return (
    <div
      className={cn(
        "pointer-events-none rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg",
        className
      )}
    >
      {title && (
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
      )}
      {children}
    </div>
  )
}
