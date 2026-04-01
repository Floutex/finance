"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/components/ui/utils"

type QuickRange = "1M" | "3M" | "6M" | "1A" | "ALL"

interface DateRangeSelectorProps {
  activeRange: QuickRange | null
  startDate: string
  endDate: string
  dateRangeMin: string
  dateRangeMax: string
  transactionCount: number
  onApplyQuickRange: (range: QuickRange) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
}

export function DateRangeSelector({
  activeRange,
  startDate,
  endDate,
  dateRangeMin,
  dateRangeMax,
  transactionCount,
  onApplyQuickRange,
  onStartDateChange,
  onEndDateChange,
}: DateRangeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 animate-fade-in">
      <div className="flex flex-wrap gap-1.5 rounded-full bg-muted/50 p-1">
        {(["1M", "3M", "6M", "1A", "ALL"] as const).map(range => (
          <Button
            key={range}
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={activeRange === range}
            className={cn(
              "h-8 rounded-full px-3 text-xs font-semibold transition",
              activeRange === range
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onApplyQuickRange(range)}
          >
            {range === "ALL" ? "Tudo" : range}
          </Button>
        ))}
      </div>
      <Input
        id="global-start-date"
        type="date"
        className="h-8 rounded-xl border-border/50 bg-black/40 text-sm w-36"
        value={startDate}
        min={dateRangeMin}
        max={endDate || dateRangeMax}
        onChange={e => onStartDateChange(e.target.value)}
      />
      <span className="text-muted-foreground/50 text-xs">&rarr;</span>
      <Input
        id="global-end-date"
        type="date"
        className="h-8 rounded-xl border-border/50 bg-black/40 text-sm w-36"
        value={endDate}
        min={startDate || dateRangeMin}
        max={dateRangeMax}
        onChange={e => onEndDateChange(e.target.value)}
      />
      <span className="text-xs text-muted-foreground">{transactionCount} transações</span>
    </div>
  )
}
