"use client"

import * as React from "react"
import { Filter, X } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/v2/primitives/sheet"
import { Button } from "@/components/v2/primitives/button"
import { Input } from "@/components/v2/primitives/input"
import { Label } from "@/components/v2/primitives/label"
import { Badge } from "@/components/v2/primitives/badge"
import { cn } from "@/components/v2/primitives/utils"
import type { TransactionsToolbarValue } from "@/components/v2/transactions/transactions-toolbar"

const RANGES = ["1M", "3M", "6M", "1A", "ALL"] as const
type Range = (typeof RANGES)[number]

const RANGE_LABELS: Record<Range, string> = {
  "1M": "1 mês",
  "3M": "3 meses",
  "6M": "6 meses",
  "1A": "1 ano",
  ALL: "Tudo",
}

type MobileFiltersSheetProps = {
  value: TransactionsToolbarValue
  onChange: (next: TransactionsToolbarValue) => void
  /** Visible only on mobile — desktop uses the inline toolbar. */
  className?: string
}

export function MobileFiltersSheet({
  value,
  onChange,
  className,
}: MobileFiltersSheetProps) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(value)

  React.useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  const activeCount = [
    value.search ? 1 : 0,
    value.start ? 1 : 0,
    value.end ? 1 : 0,
    value.activeRange ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const apply = () => {
    onChange(draft)
    setOpen(false)
  }

  const clear = () => {
    const empty: TransactionsToolbarValue = {
      search: "",
      start: "",
      end: "",
      activeRange: null,
    }
    setDraft(empty)
    onChange(empty)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn("md:hidden", className)}
      >
        <Filter className="size-3.5" />
        Filtros
        {activeCount > 0 && (
          <Badge variant="default" className="ml-1 tabular-nums">
            {activeCount}
          </Badge>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] rounded-t-xl border-t border-border p-0"
        >
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              Refina a tabela e as métricas do período.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="mfilter-search">Buscar</Label>
              <Input
                id="mfilter-search"
                placeholder="Descrição, categoria, pagador…"
                value={draft.search}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, search: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Período rápido</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {RANGES.map((r) => (
                  <Button
                    key={r}
                    variant={draft.activeRange === r ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        activeRange: d.activeRange === r ? null : r,
                      }))
                    }
                    className="h-9 text-xs"
                  >
                    {RANGE_LABELS[r]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mfilter-start">De</Label>
                <Input
                  id="mfilter-start"
                  type="date"
                  value={draft.start}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      start: e.target.value,
                      activeRange: null,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mfilter-end">Até</Label>
                <Input
                  id="mfilter-end"
                  type="date"
                  value={draft.end}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      end: e.target.value,
                      activeRange: null,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={clear}>
              <X className="size-4" />
              Limpar
            </Button>
            <Button onClick={apply}>Aplicar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
