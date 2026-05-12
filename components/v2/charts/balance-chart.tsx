"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { ArrowLeft } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/v2/primitives/button"
import { Currency } from "@/components/v2/finance/currency"
import { ChartTooltip } from "@/components/v2/charts/chart-tooltip"
import { cn } from "@/components/v2/primitives/utils"
import type { DailyDelta } from "@/lib/v2/dashboard-metrics"

type BalancePoint = { date: string; balance: number }

type BalanceChartProps = {
  series: BalancePoint[]
  /** Optional date range to slice the series in the chart (yyyy-MM-dd). */
  startDate?: string
  endDate?: string
  /** Per-day signed transaction deltas. If provided, clicking a day opens
   *  a drill-down bar chart of that day's transactions. */
  dailyBreakdown?: Record<string, DailyDelta[]>
  className?: string
}

const MAX_BARS = 10
const POSITIVE_COLOR = "hsl(var(--success))"
const NEGATIVE_COLOR = "hsl(var(--destructive))"

const formatAxisLabel = (value: number) => {
  const abs = Math.abs(value)
  const sign = value < 0 ? "−" : ""
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return `${sign}${abs.toFixed(0)}`
}

const truncate = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s

export function BalanceChart({
  series,
  startDate,
  endDate,
  dailyBreakdown,
  className,
}: BalanceChartProps) {
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  React.useEffect(() => {
    setSelectedDate(null)
  }, [series, startDate, endDate])

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

  const isClickable = !!dailyBreakdown

  const drillBars = React.useMemo(() => {
    if (!selectedDate || !dailyBreakdown) return []
    const items = dailyBreakdown[selectedDate] ?? []
    const sorted = [...items].sort(
      (a, b) => Math.abs(b.delta) - Math.abs(a.delta)
    )
    if (sorted.length <= MAX_BARS) return sorted
    const top = sorted.slice(0, MAX_BARS - 1)
    const rest = sorted.slice(MAX_BARS - 1)
    const restDelta = rest.reduce((s, x) => s + x.delta, 0)
    top.push({
      id: "__others__",
      description: "Outros",
      delta: Number(restDelta.toFixed(2)),
    })
    return top
  }, [selectedDate, dailyBreakdown])

  const isDrilling = selectedDate !== null

  const handleChartClick = (e: unknown) => {
    if (!isClickable) return
    const evt = e as {
      activePayload?: Array<{ payload?: { date?: string } }>
    } | null
    const date = evt?.activePayload?.[0]?.payload?.date
    if (!date) return
    if (!dailyBreakdown?.[date]?.length) return
    setSelectedDate(date)
  }

  return (
    <div className={cn("surface-1 flex flex-col gap-4 rounded-xl p-5", className)}>
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {isDrilling ? (
            <>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Transações do dia
              </p>
              <h3 className="truncate text-sm font-medium">
                {format(parseISO(selectedDate!), "dd 'de' MMM, yyyy")}
              </h3>
            </>
          ) : (
            <>
              <h3 className="text-sm font-medium">Evolução do saldo</h3>
              <p className="text-xs text-muted-foreground">
                Posição líquida ao longo do tempo
              </p>
            </>
          )}
        </div>
        {isDrilling ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(null)}
            className="shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </Button>
        ) : (
          summary && (
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
          )
        )}
      </header>

      <div className="h-72 w-full">
        {!hasData ? (
          <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
            Sem dados para o período selecionado
          </div>
        ) : isDrilling ? (
          drillBars.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
              Sem variações de saldo neste dia
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={drillBars}
                margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="description"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tickFormatter={(v: string) => truncate(v, 12)}
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
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload as DailyDelta
                    return (
                      <ChartTooltip title={p.description}>
                        <Currency value={p.delta} signed />
                      </ChartTooltip>
                    )
                  }}
                />
                <Bar dataKey="delta" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {drillBars.map((b) => (
                    <Cell
                      key={b.id}
                      fill={b.delta >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
              onClick={handleChartClick}
              style={isClickable ? { cursor: "pointer" } : undefined}
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
                  const hasDrill = !!dailyBreakdown?.[p.date]?.length
                  return (
                    <ChartTooltip
                      title={format(parseISO(p.date), "dd 'de' MMM, yyyy")}
                    >
                      <Currency value={p.balance} signed />
                      {hasDrill && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          Clique para detalhar
                        </div>
                      )}
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
