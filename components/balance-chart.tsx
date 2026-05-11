"use client"

import { memo, useMemo } from "react"
import { format, parseISO } from "date-fns"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from "recharts"
import { cn, getUserColor } from "@/components/ui/utils"
import { AnimatedNumber } from "@/components/ui/animated-number"

type BalancePoint = {
  date: string
  balance: number
}

const normalizeDate = (value: string) => {
  try {
    return format(parseISO(value), "yyyy-MM-dd")
  } catch {
    return value
  }
}

const balanceCurrencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const formatBalance = (value: number) => balanceCurrencyFormatter.format(value)

const formatAxisLabel = (value: number) => {
  const absValue = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  if (absValue >= 1000) {
    return `${sign}${(absValue / 1000).toFixed(1).replace('.0', '')}k`
  }
  return `${sign}${absValue.toFixed(0)}`
}

const formatSignedCurrency = (value: number) => {
  if (value === 0) {
    return formatBalance(0)
  }
  const prefix = value > 0 ? "+" : "-"
  return `${prefix}${formatBalance(Math.abs(value))}`
}

const formatSignedPercent = (value: number | null) => {
  if (value === null) {
    return null
  }
  if (value === 0) {
    return "0%"
  }
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${value.toFixed(2)}%`
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: { date: string; balance: number; formattedDate: string } }>
  userColor: string
}

const CustomTooltip = ({ active, payload, userColor }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const data = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-black/90 px-3 py-2.5 shadow-xl backdrop-blur">
      <div className="text-[10px] font-semibold uppercase text-muted-foreground">
        {data.formattedDate}
      </div>
      <div className="mt-1 text-sm font-semibold" style={{ color: userColor }}>
        {formatBalance(data.balance)}
      </div>
    </div>
  )
}

interface BalanceChartProps {
  series: BalancePoint[]
  currentUser?: string
  startDate?: string
  endDate?: string
}

function BalanceChartImpl(props: BalanceChartProps) {
  const userColor = useMemo(() => {
    return props.currentUser ? getUserColor(props.currentUser) : "hsl(var(--primary))"
  }, [props.currentUser])

  // Uma única passada: normaliza, ordena, filtra por janela de data e pré-formata.
  // `parseISO` no filtro vira comparação direta de string yyyy-MM-dd (lexicográfica = cronológica).
  const { chartData, filteredSeries, hasAnyData } = useMemo(() => {
    if (props.series.length === 0) {
      return { chartData: [], filteredSeries: [] as BalancePoint[], hasAnyData: false }
    }
    const normalized = props.series
      .map(point => ({ date: normalizeDate(point.date), balance: point.balance }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

    const start = props.startDate || null
    const end = props.endDate || null
    let subset = normalized
    if (start || end) {
      const filtered = normalized.filter(p =>
        (!start || p.date >= start) && (!end || p.date <= end)
      )
      if (filtered.length > 0) subset = filtered
    }
    const data = subset.map(point => ({
      ...point,
      formattedDate: format(parseISO(point.date), "dd/MM/yyyy"),
    }))
    return { chartData: data, filteredSeries: subset, hasAnyData: normalized.length > 0 }
  }, [props.series, props.startDate, props.endDate])

  const variationSummary = useMemo(() => {
    if (filteredSeries.length === 0) return null
    const first = filteredSeries[0]
    const last = filteredSeries[filteredSeries.length - 1]
    const change = Number((last.balance - first.balance).toFixed(2))
    const percentChange = first.balance === 0 ? null : Number(((change / first.balance) * 100).toFixed(2))
    return { change, percentChange }
  }, [filteredSeries])

  if (!hasAnyData) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
        Sem dados para o período selecionado
      </div>
    )
  }

  return (
    <article className="relative flex w-full flex-col gap-5 overflow-visible rounded-2xl border border-border/70 bg-black/40 p-4 shadow-sm backdrop-blur-xl sm:p-5 lg:gap-6 lg:p-6">
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">Evolução do Saldo</span>
        {variationSummary && (
          <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", variationSummary.change >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive")}>
            <AnimatedNumber value={variationSummary.change} formatFn={formatSignedCurrency} />
            {variationSummary.percentChange !== null && (
              <span className="opacity-80">({formatSignedPercent(variationSummary.percentChange)})</span>
            )}
          </div>
        )}
      </header>

      <section className="relative" aria-label="Gráfico de evolução do saldo">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={userColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={userColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(parseISO(value), "dd/MM")}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              tickFormatter={formatAxisLabel}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dx={-5}
              width={45}
            />
            <Tooltip content={<CustomTooltip userColor={userColor} />} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} opacity={0.8} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={userColor}
              strokeWidth={2.5}
              fill="url(#balanceGradient)"
              dot={false}
              activeDot={{ r: 6, fill: userColor, stroke: "hsl(var(--background))", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        <footer className="flex justify-between px-4 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:px-5 sm:text-[11px] lg:px-6" aria-label="Eixo de datas">
          <time dateTime={filteredSeries[0]?.date}>
            {filteredSeries[0] && format(parseISO(filteredSeries[0].date), "dd/MM")}
          </time>
          {filteredSeries.length > 2 && (
            <time dateTime={filteredSeries[Math.floor(filteredSeries.length / 2)]?.date}>
              {format(parseISO(filteredSeries[Math.floor(filteredSeries.length / 2)].date), "dd/MM")}
            </time>
          )}
          <time dateTime={filteredSeries[filteredSeries.length - 1]?.date}>
            {filteredSeries[filteredSeries.length - 1] && format(parseISO(filteredSeries[filteredSeries.length - 1].date), "dd/MM")}
          </time>
        </footer>
      </section>
    </article>
  )
}

export const BalanceChart = memo(BalanceChartImpl)
