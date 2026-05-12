"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Currency } from "@/components/v2/finance/currency"
import { ChartTooltip } from "@/components/v2/charts/chart-tooltip"
import { cn } from "@/components/v2/primitives/utils"

type BalancePoint = { date: string; balance: number }

type BalanceChartProps = {
  series: BalancePoint[]
  /** Optional date range to slice the series in the chart (yyyy-MM-dd). */
  startDate?: string
  endDate?: string
  className?: string
}

const formatAxisLabel = (value: number) => {
  const abs = Math.abs(value)
  const sign = value < 0 ? "−" : ""
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return `${sign}${abs.toFixed(0)}`
}

export function BalanceChart({ series, startDate, endDate, className }: BalanceChartProps) {
  const { chartData, summary, hasData } = React.useMemo(() => {
    if (series.length === 0) {
      return { chartData: [], summary: null, hasData: false }
    }
    const normalized = [...series].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    )
    let subset = normalized
    if (startDate || endDate) {
      const sliced = normalized.filter(
        (p) => (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate)
      )
      if (sliced.length > 0) subset = sliced
    }
    const data = subset.map((p) => ({
      ...p,
      label: format(parseISO(p.date), "dd/MM"),
    }))
    const first = subset[0]?.balance ?? 0
    const last = subset[subset.length - 1]?.balance ?? 0
    const change = Number((last - first).toFixed(2))
    const percent = first === 0 ? null : Number(((change / Math.abs(first)) * 100).toFixed(1))
    return {
      chartData: data,
      summary: { current: last, change, percent },
      hasData: true,
    }
  }, [series, startDate, endDate])

  return (
    <div className={cn("surface-1 flex flex-col gap-4 rounded-xl p-5", className)}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">Evolução do saldo</h3>
          <p className="text-xs text-muted-foreground">
            Posição líquida ao longo do tempo
          </p>
        </div>
        {summary && (
          <div className="text-right">
            <Currency
              value={summary.current}
              display
              signed
              className="text-2xl"
            />
            <div className="mt-1 flex items-center justify-end gap-1.5 text-xs">
              <Currency value={summary.change} signed compact />
              {summary.percent !== null && (
                <span className="text-muted-foreground">
                  ({summary.percent > 0 ? "+" : ""}
                  {summary.percent}%)
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="h-72 w-full">
        {!hasData ? (
          <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
            Sem dados para o período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="v2-balance-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
                dy={6}
              />
              <YAxis
                tickFormatter={formatAxisLabel}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload as {
                    date: string
                    balance: number
                  }
                  return (
                    <ChartTooltip
                      title={format(parseISO(p.date), "dd 'de' MMM, yyyy")}
                    >
                      <Currency value={p.balance} signed />
                    </ChartTooltip>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#v2-balance-gradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "hsl(var(--primary))",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
