"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, parseISO, subMonths, subYears } from "date-fns"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, getUserColor } from "@/components/ui/utils"

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

const formatBalance = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

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

type QuickRange = "1M" | "3M" | "6M" | "1A" | "ALL"

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

export const BalanceChart = (props: { series: BalancePoint[]; currentUser?: string }) => {
  const [activeRange, setActiveRange] = useState<QuickRange | null>(null)

  const userColor = useMemo(() => {
    return props.currentUser ? getUserColor(props.currentUser) : "hsl(var(--primary))"
  }, [props.currentUser])

  const normalizedSeries = useMemo(() => {
    return props.series
      .map(point => ({
        date: normalizeDate(point.date),
        balance: point.balance
      }))
      .sort((first, second) => parseISO(first.date).getTime() - parseISO(second.date).getTime())
  }, [props.series])

  const [startDate, setStartDate] = useState(() => normalizedSeries[0]?.date ?? "")
  const [endDate, setEndDate] = useState(() => normalizedSeries[normalizedSeries.length - 1]?.date ?? "")

  useEffect(() => {
    if (normalizedSeries.length === 0) {
      setStartDate("")
      setEndDate("")
      return
    }
    setStartDate(prev => {
      if (!prev || prev < normalizedSeries[0].date || prev > normalizedSeries[normalizedSeries.length - 1].date) {
        return normalizedSeries[0].date
      }
      return prev
    })
    setEndDate(prev => {
      if (!prev || prev > normalizedSeries[normalizedSeries.length - 1].date || prev < normalizedSeries[0].date) {
        return normalizedSeries[normalizedSeries.length - 1].date
      }
      return prev
    })
  }, [normalizedSeries])

  const filteredSeries = useMemo(() => {
    if (normalizedSeries.length === 0) return []
    const start = startDate ? parseISO(startDate) : null
    const end = endDate ? parseISO(endDate) : null
    const subset = normalizedSeries.filter(point => {
      const current = parseISO(point.date)
      const afterStart = start ? current >= start : true
      const beforeEnd = end ? current <= end : true
      return afterStart && beforeEnd
    })
    return subset.length === 0 ? normalizedSeries : subset
  }, [normalizedSeries, startDate, endDate])

  const chartData = useMemo(() => {
    return filteredSeries.map(point => ({
      ...point,
      formattedDate: format(parseISO(point.date), "dd/MM/yyyy")
    }))
  }, [filteredSeries])

  const minDate = normalizedSeries[0]?.date ?? ""
  const maxDate = normalizedSeries[normalizedSeries.length - 1]?.date ?? ""

  const periodLabel = useMemo(() => {
    if (!startDate && !endDate && minDate && maxDate) {
      return `${format(parseISO(minDate), "dd MMM yyyy")} — ${format(parseISO(maxDate), "dd MMM yyyy")}`
    }
    if (!startDate && !endDate) {
      return "Período completo"
    }
    const startText = startDate ? format(parseISO(startDate), "dd MMM yyyy") : "Início"
    const endText = endDate ? format(parseISO(endDate), "dd MMM yyyy") : "Atual"
    if (startText === endText) {
      return startText
    }
    return `${startText} — ${endText}`
  }, [startDate, endDate, minDate, maxDate])

  const customRangeActive = useMemo(() => {
    if (!startDate || !endDate || !minDate || !maxDate) return false
    return startDate !== minDate || endDate !== maxDate
  }, [startDate, endDate, minDate, maxDate])

  const variationSummary = useMemo(() => {
    if (filteredSeries.length === 0) return null
    const first = filteredSeries[0]
    const last = filteredSeries[filteredSeries.length - 1]
    const change = Number((last.balance - first.balance).toFixed(2))
    const percentChange = first.balance === 0 ? null : Number(((change / first.balance) * 100).toFixed(2))
    return {
      startDate: first.date,
      endDate: last.date,
      change,
      percentChange
    }
  }, [filteredSeries])

  const handleStartChange = useCallback((value: string) => {
    setActiveRange(null)
    setStartDate(value)
    setEndDate(prev => (!prev || (value && prev < value)) ? value : prev)
  }, [])

  const handleEndChange = useCallback((value: string) => {
    setActiveRange(null)
    setEndDate(value)
    setStartDate(prev => (!prev || (value && prev > value)) ? value : prev)
  }, [])

  const applyQuickRange = useCallback((range: QuickRange) => {
    if (normalizedSeries.length === 0) return
    const firstDate = parseISO(normalizedSeries[0].date)
    const lastDate = parseISO(normalizedSeries[normalizedSeries.length - 1].date)
    if (range === "ALL") {
      setStartDate(format(firstDate, "yyyy-MM-dd"))
      setEndDate(format(lastDate, "yyyy-MM-dd"))
      setActiveRange(range)
      return
    }
    let computedStart = firstDate
    if (range === "1M") computedStart = subMonths(lastDate, 1)
    else if (range === "3M") computedStart = subMonths(lastDate, 3)
    else if (range === "6M") computedStart = subMonths(lastDate, 6)
    else if (range === "1A") computedStart = subYears(lastDate, 1)
    if (computedStart < firstDate) computedStart = firstDate
    setStartDate(format(computedStart, "yyyy-MM-dd"))
    setEndDate(format(lastDate, "yyyy-MM-dd"))
    setActiveRange(range)
  }, [normalizedSeries])

  const clearSelection = useCallback(() => {
    if (normalizedSeries.length === 0) return
    setStartDate(normalizedSeries[0].date)
    setEndDate(normalizedSeries[normalizedSeries.length - 1].date)
    setActiveRange(null)
  }, [normalizedSeries])

  if (normalizedSeries.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
        Sem dados para o período selecionado
      </div>
    )
  }

  const quickRanges: QuickRange[] = ["1M", "3M", "6M", "1A", "ALL"]
  const hasRangeFilter = customRangeActive || activeRange !== null

  return (
    <article className="relative flex w-full flex-col gap-5 overflow-visible rounded-2xl border border-border/70 bg-black/40 p-4 shadow-sm backdrop-blur-xl sm:p-5 lg:gap-6 lg:p-6">
      <header className="flex flex-col gap-4 lg:gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Período ativo</span>
            <h2 className="text-xl font-semibold text-foreground md:text-2xl">{periodLabel}</h2>
          </div>
          <nav className="flex flex-wrap items-center gap-2 lg:gap-3" aria-label="Filtros rápidos de período">
            <div className="flex flex-wrap gap-1.5 rounded-full bg-muted/50 p-1 lg:gap-2">
              {quickRanges.map(range => (
                <Button
                  key={range}
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={activeRange === range}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs font-semibold transition lg:h-9 lg:px-4",
                    activeRange === range
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => applyQuickRange(range)}
                >
                  {range === "ALL" ? "Tudo" : range}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasRangeFilter}
              aria-pressed={hasRangeFilter}
              onClick={clearSelection}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-semibold transition lg:h-9 lg:px-4",
                hasRangeFilter
                  ? "border-primary/60 bg-primary/10 hover:bg-primary/20"
                  : "border-dashed border-border text-muted-foreground"
              )}
              style={hasRangeFilter ? { color: userColor, borderColor: userColor + '99' } : {}}
            >
              Limpar
            </Button>
          </nav>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3 lg:gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="chart-start-date" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Início
            </label>
            <Input
              id="chart-start-date"
              type="date"
              className={cn(
                "h-10 rounded-2xl border border-border bg-background/80 text-sm transition focus-visible:ring-0 sm:w-40 lg:h-11 lg:w-48",
                startDate && "text-foreground shadow-sm"
              )}
              style={startDate ? { borderColor: userColor + '99', backgroundColor: userColor + '0D' } : {}}
              value={startDate}
              min={minDate}
              max={endDate || maxDate}
              onChange={event => handleStartChange(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="chart-end-date" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fim
            </label>
            <Input
              id="chart-end-date"
              type="date"
              className={cn(
                "h-10 rounded-2xl border border-border bg-background/80 text-sm transition focus-visible:ring-0 sm:w-40 lg:h-11 lg:w-48",
                endDate && "text-foreground shadow-sm"
              )}
              style={endDate ? { borderColor: userColor + '99', backgroundColor: userColor + '0D' } : {}}
              value={endDate}
              min={startDate || minDate}
              max={maxDate}
              onChange={event => handleEndChange(event.target.value)}
            />
          </div>
        </div>
      </header>

      <section className="relative" aria-label="Gráfico de evolução do saldo">
        {variationSummary && (
          <aside className="pointer-events-none absolute right-3 top-2 z-20 min-w-[140px] rounded-xl border border-border/70 bg-background/90 px-3 py-2.5 text-right shadow-lg backdrop-blur sm:right-4 sm:min-w-[160px] sm:rounded-2xl sm:px-4 sm:py-3 lg:right-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">Variação</p>
            <p className={cn("text-base font-semibold sm:text-lg lg:text-xl", variationSummary.change >= 0 ? "text-emerald-400" : "text-destructive")}>
              {formatSignedCurrency(variationSummary.change)}
            </p>
            {variationSummary.percentChange !== null && (
              <p className="text-xs font-medium text-foreground sm:text-sm">{formatSignedPercent(variationSummary.percentChange)}</p>
            )}
            <p className="text-[10px] text-muted-foreground sm:text-[11px]">
              {format(parseISO(variationSummary.startDate), "dd/MM")} — {format(parseISO(variationSummary.endDate), "dd/MM")}
            </p>
          </aside>
        )}

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
