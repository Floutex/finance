"use client"

import * as React from "react"
import { ArrowLeft } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { Button } from "@/components/v2/primitives/button"
import { Currency } from "@/components/v2/finance/currency"
import { ChartTooltip } from "@/components/v2/charts/chart-tooltip"
import { chartPalette } from "@/lib/v2/tokens"
import { cn } from "@/components/v2/primitives/utils"

export type CategoryTotal = { category: string; total: number }

type CategoryPieChartProps = {
  data: CategoryTotal[]
  title?: string
  description?: string
  className?: string
  /** Maximum number of slices to render; the rest collapses into "Outros". */
  maxSlices?: number
  /**
   * If provided, clicking a slice opens a drill-down view showing the rows
   * returned by this callback (typically top-N transactions in the category).
   */
  drilldownFor?: (category: string) => CategoryTotal[]
  /** Optional label rendered above the drill-down (e.g. "Top transações"). */
  drilldownLabel?: string
}

export function CategoryPieChart({
  data,
  title,
  description,
  className,
  maxSlices = 8,
  drilldownFor,
  drilldownLabel = "Top transações",
}: CategoryPieChartProps) {
  const [selected, setSelected] = React.useState<string | null>(null)

  // Reset drill-down when the upstream data changes (e.g. filter applied).
  React.useEffect(() => {
    setSelected(null)
  }, [data])

  const sourceData = React.useMemo(() => {
    if (selected && drilldownFor) return drilldownFor(selected)
    return data
  }, [selected, drilldownFor, data])

  const { slices, total } = React.useMemo(() => {
    if (sourceData.length === 0) return { slices: [], total: 0 }
    const sorted = [...sourceData].sort((a, b) => b.total - a.total)
    let slices: CategoryTotal[]
    if (sorted.length <= maxSlices) {
      slices = sorted
    } else {
      const top = sorted.slice(0, maxSlices - 1)
      const rest = sorted.slice(maxSlices - 1)
      const restTotal = rest.reduce((s, x) => s + x.total, 0)
      slices = [...top, { category: "Outros", total: restTotal }]
    }
    const total = slices.reduce((s, x) => s + x.total, 0)
    return { slices, total }
  }, [sourceData, maxSlices])

  const isDrilling = selected !== null
  const clickable = !isDrilling && !!drilldownFor

  const handleSliceClick = (slice: CategoryTotal) => {
    if (!clickable) return
    if (slice.category === "Outros") return // collapsed group — skip
    setSelected(slice.category)
  }

  return (
    <div className={cn("surface-1 flex flex-col gap-4 rounded-xl p-5", className)}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {isDrilling ? (
            <>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {drilldownLabel}
              </p>
              <h3 className="truncate text-sm font-medium">{selected}</h3>
            </>
          ) : (
            <>
              {title && <h3 className="text-sm font-medium">{title}</h3>}
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </>
          )}
        </div>
        {isDrilling && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelected(null)}
            className="shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </Button>
        )}
      </header>

      {total === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          {isDrilling ? "Sem transações nessa categoria" : "Sem dados no período"}
        </div>
      ) : (
        <div className="grid grid-cols-[160px_1fr] items-center gap-6">
          <div className="relative h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  strokeWidth={0}
                  isAnimationActive={false}
                  onClick={
                    clickable
                      ? (entry: unknown) => {
                          const payload = (entry as { payload?: CategoryTotal })
                            .payload
                          if (payload) handleSliceClick(payload)
                        }
                      : undefined
                  }
                  cursor={clickable ? "pointer" : "default"}
                >
                  {slices.map((_, i) => (
                    <Cell
                      key={i}
                      fill={chartPalette[i % chartPalette.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const slice = payload[0].payload as CategoryTotal
                    const pct = total > 0 ? (slice.total / total) * 100 : 0
                    return (
                      <ChartTooltip title={slice.category}>
                        <div className="flex items-center justify-between gap-3">
                          <Currency value={slice.total} />
                          <span className="text-muted-foreground">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        {clickable && slice.category !== "Outros" && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            Clique para detalhar
                          </div>
                        )}
                      </ChartTooltip>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total
              </span>
              <Currency value={total} className="text-sm font-semibold" />
            </div>
          </div>

          <ul className="flex flex-col gap-1.5 text-xs">
            {slices.map((s, i) => {
              const pct = total > 0 ? (s.total / total) * 100 : 0
              const isClickableRow = clickable && s.category !== "Outros"
              return (
                <li key={s.category}>
                  <button
                    type="button"
                    disabled={!isClickableRow}
                    onClick={() => handleSliceClick(s)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm text-left",
                      isClickableRow && "hover:bg-accent/40 cursor-pointer",
                      !isClickableRow && "cursor-default"
                    )}
                  >
                    <span
                      className="size-2 shrink-0 rounded-sm"
                      style={{
                        backgroundColor: chartPalette[i % chartPalette.length],
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate">{s.category}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {pct.toFixed(0)}%
                    </span>
                    <Currency
                      value={s.total}
                      className="w-24 text-right tabular-nums"
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
