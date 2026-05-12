"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import { Button } from "@/components/v2/primitives/button"
import { Input } from "@/components/v2/primitives/input"

const RANGES = ["1M", "3M", "6M", "1A", "ALL"] as const
type Range = (typeof RANGES)[number]

export type TransactionsToolbarValue = {
  search: string
  start: string
  end: string
  activeRange: Range | null
}

type TransactionsToolbarProps = {
  value: TransactionsToolbarValue
  onChange: (next: TransactionsToolbarValue) => void
  /** Disables quick-range chips if not enough data exists yet. */
  disabledQuickRange?: boolean
  /** Quick-range chip labels (defaults to RANGES). */
  className?: string
}

const RANGE_LABELS: Record<Range, string> = {
  "1M": "1m",
  "3M": "3m",
  "6M": "6m",
  "1A": "1a",
  ALL: "Tudo",
}

export function TransactionsToolbar({
  value,
  onChange,
  disabledQuickRange,
  className,
}: TransactionsToolbarProps) {
  const setRange = (range: Range) => {
    onChange({ ...value, activeRange: range })
  }

  const setSearch = (search: string) => {
    onChange({ ...value, search })
  }

  const setStart = (start: string) =>
    onChange({ ...value, start, activeRange: null })

  const setEnd = (end: string) => onChange({ ...value, end, activeRange: null })

  const clearAll = () =>
    onChange({ search: "", start: "", end: "", activeRange: null })

  const hasFilter = value.search || value.start || value.end || value.activeRange

  return (
    <div className={cn("hidden flex-wrap items-center gap-2 md:flex", className)}>
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar descrição, categoria, pagador…"
          value={value.search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-8"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex h-9 items-center rounded-md border border-border bg-transparent p-0.5">
          {RANGES.map((r) => (
            <Button
              key={r}
              type="button"
              variant={value.activeRange === r ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRange(r)}
              disabled={disabledQuickRange}
              className="h-7 px-2 text-[11px] font-medium uppercase"
            >
              {RANGE_LABELS[r]}
            </Button>
          ))}
        </div>

        <Input
          type="date"
          value={value.start}
          onChange={(e) => setStart(e.target.value)}
          className="h-9 w-[140px]"
          aria-label="Data inicial"
        />
        <Input
          type="date"
          value={value.end}
          onChange={(e) => setEnd(e.target.value)}
          className="h-9 w-[140px]"
          aria-label="Data final"
        />

        {hasFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-muted-foreground"
          >
            <X className="size-3.5" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  )
}
