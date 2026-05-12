"use client"

import * as React from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { Currency } from "@/components/v2/finance/currency"
import { ChartTooltip } from "@/components/v2/charts/chart-tooltip"
import { chartPalette } from "@/lib/v2/tokens"
import { cn } from "@/components/v2/primitives/utils"

type CategoryTotal = { category: string; total: number }

type CategoryPieChartProps = {
  data: CategoryTotal[]
  title?: string
  description?: string
  className?: string
  /** Maximum number of slices to render; the rest collapses into "Outros". */
  maxSlices?: number
}

export function CategoryPieChart({
  data,
  title,
  description,
  className,
  maxSlices = 8,
}: CategoryPieChartProps) {
  const { slices, total } = React.useMemo(() => {
    if (data.length === 0) return { slices: [], total: 0 }
    const sorted = [...data].sort((a, b) => b.total - a.total)
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
  }, [data, maxSlices])

  return (
    <div className={cn("surface-1 flex flex-col gap-4 rounded-xl p-5", className)}>
      {(title || description) && (
        <header>
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </header>
      )}
      {total === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          Sem dados no período
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
              return (
                <li
                  key={s.category}
                  className="flex items-center gap-2"
                >
                  <span
                    className="size-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: chartPalette[i % chartPalette.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate">{s.category}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {pct.toFixed(0)}%
                  </span>
                  <Currency value={s.total} className="w-24 text-right tabular-nums" />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
