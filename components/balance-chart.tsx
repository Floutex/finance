"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format, parseISO, subMonths, subYears } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/components/ui/utils"

type BalancePoint = {
  date: string
  balance: number
}

type Scale = {
  min: number
  max: number
  range: number
}

const computeScale = (series: BalancePoint[]): Scale => {
  if (series.length === 0) {
    return {
      min: 0,
      max: 0,
      range: 1
    }
  }
  const balances = series.map(point => point.balance)
  let min = Math.min(...balances, 0)
  let max = Math.max(...balances, 0)
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.1, 1)
    min -= padding
    max += padding
  }
  const range = max - min === 0 ? 1 : max - min
  return {
    min,
    max,
    range
  }
}

const buildPath = (
  series: BalancePoint[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
  scale: Scale
) => {
  if (series.length === 0) {
    return ""
  }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const step = series.length === 1 ? 0 : innerWidth / (series.length - 1)
  return series
    .map((point, index) => {
      const x = padding.left + step * index
      const y = padding.top + innerHeight - ((point.balance - scale.min) / scale.range) * innerHeight
      return `${index === 0 ? "M" : "L"}${x},${Number.isFinite(y) ? y : height}`
    })
    .join(" ")
}

const buildArea = (
  series: BalancePoint[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
  scale: Scale
) => {
  if (series.length === 0) {
    return ""
  }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const step = series.length === 1 ? 0 : innerWidth / (series.length - 1)
  const top = series
    .map((point, index) => {
      const x = padding.left + step * index
      const y = padding.top + innerHeight - ((point.balance - scale.min) / scale.range) * innerHeight
      return `${index === 0 ? "M" : "L"}${x},${Number.isFinite(y) ? y : height}`
    })
    .join(" ")
  const lastX = padding.left + step * (series.length - 1)
  const bottom = padding.top + innerHeight
  return `${top} L${lastX},${bottom} L${padding.left},${bottom} Z`
}

const pickAxisLabels = (series: BalancePoint[]) => {
  if (series.length === 0) {
    return []
  }
  if (series.length <= 3) {
    return series.map(point => point.date)
  }
  const first = series[0].date
  const middle = series[Math.floor(series.length / 2)].date
  const last = series[series.length - 1].date
  return [first, middle, last]
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
  return `${prefix}${Math.abs(value).toFixed(2)}%`
}

type QuickRange = "1M" | "3M" | "6M" | "1A" | "ALL"

export const BalanceChart = (props: { series: BalancePoint[] }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(700)
  const height = 320
  const svgRef = useRef<SVGSVGElement | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const [labelFont, setLabelFont] = useState("12px sans-serif")
  const [activeRange, setActiveRange] = useState<QuickRange | null>(null)
  const normalizedSeries = useMemo(() => {
    const list = props.series
      .map(point => ({
        date: normalizeDate(point.date),
        balance: point.balance
      }))
      .sort((first, second) => parseISO(first.date).getTime() - parseISO(second.date).getTime())
    return list
  }, [props.series])
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const bodyStyles = window.getComputedStyle(document.body)
    const fontFamily = bodyStyles.fontFamily || "sans-serif"
    setLabelFont(`12px ${fontFamily}`)
  }, [])
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const element = containerRef.current
    if (!element) {
      return
    }
    const syncWidth = (value: number) => {
      if (!Number.isFinite(value) || value <= 0) {
        return
      }
      setWidth(previous => {
        if (Math.abs(previous - value) < 1) {
          return previous
        }
        return value
      })
    }
    syncWidth(element.getBoundingClientRect().width)
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) {
        return
      }
      syncWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const [startDate, setStartDate] = useState(() => normalizedSeries[0]?.date ?? "")
  const [endDate, setEndDate] = useState(() => normalizedSeries[normalizedSeries.length - 1]?.date ?? "")
  useEffect(() => {
    if (normalizedSeries.length === 0) {
      setStartDate("")
      setEndDate("")
      return
    }
    setStartDate(previous => {
      if (!previous) {
        return normalizedSeries[0].date
      }
      if (previous < normalizedSeries[0].date) {
        return normalizedSeries[0].date
      }
      if (previous > normalizedSeries[normalizedSeries.length - 1].date) {
        return normalizedSeries[0].date
      }
      return previous
    })
    setEndDate(previous => {
      if (!previous) {
        return normalizedSeries[normalizedSeries.length - 1].date
      }
      if (previous > normalizedSeries[normalizedSeries.length - 1].date) {
        return normalizedSeries[normalizedSeries.length - 1].date
      }
      if (previous < normalizedSeries[0].date) {
        return normalizedSeries[normalizedSeries.length - 1].date
      }
      return previous
    })
  }, [normalizedSeries])
  const filteredSeries = useMemo(() => {
    if (normalizedSeries.length === 0) {
      return []
    }
    const start = startDate ? parseISO(startDate) : null
    const end = endDate ? parseISO(endDate) : null
    const subset = normalizedSeries.filter(point => {
      const current = parseISO(point.date)
      const afterStart = start ? current >= start : true
      const beforeEnd = end ? current <= end : true
      return afterStart && beforeEnd
    })
    if (subset.length === 0) {
      return normalizedSeries
    }
    return subset
  }, [normalizedSeries, startDate, endDate])
  const scale = useMemo(() => computeScale(filteredSeries), [filteredSeries])
  const labels = useMemo(() => pickAxisLabels(filteredSeries), [filteredSeries])
  const yScale = useMemo(() => {
    if (filteredSeries.length === 0) {
      return null
    }
    const tickCount = 3
    const stepValue = scale.range / tickCount
    const ticks = Array.from({ length: tickCount + 1 }, (_, index) =>
      Number((scale.min + stepValue * index).toFixed(2))
    )
    return {
      ...scale,
      ticks
    }
  }, [filteredSeries, scale])
  const maxLabelWidth = useMemo(() => {
    if (!yScale || typeof window === "undefined") {
      return 0
    }
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) {
      return 0
    }
    context.font = labelFont
    const values = yScale.ticks.map(value => formatBalance(value))
    const widths = values.map(value => context.measureText(value).width)
    return widths.length > 0 ? Math.max(...widths) : 0
  }, [yScale, labelFont])
  const chartPadding = useMemo(
    () => ({
      top: 24,
      right: 24,
      bottom: 48,
      left: Math.max(36, Math.ceil(maxLabelWidth) + 16)
    }),
    [maxLabelWidth]
  )
  const innerWidth = width - chartPadding.left - chartPadding.right
  const innerHeight = height - chartPadding.top - chartPadding.bottom
  const path = useMemo(
    () => buildPath(filteredSeries, width, height, chartPadding, scale),
    [filteredSeries, scale, chartPadding, width, height]
  )
  const area = useMemo(
    () => buildArea(filteredSeries, width, height, chartPadding, scale),
    [filteredSeries, scale, chartPadding, width, height]
  )
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStartIndex, setSelectionStartIndex] = useState<number | null>(null)
  const [selectionEndIndex, setSelectionEndIndex] = useState<number | null>(null)
  const hoverData = useMemo(() => {
    if (
      hoverIndex === null ||
      filteredSeries.length === 0 ||
      hoverIndex < 0 ||
      hoverIndex >= filteredSeries.length
    ) {
      return null
    }
    const point = filteredSeries[hoverIndex]
    const innerStep = filteredSeries.length === 1 ? 0 : innerWidth / (filteredSeries.length - 1)
    const x = chartPadding.left + innerStep * hoverIndex
    const y =
      chartPadding.top + innerHeight - ((point.balance - scale.min) / scale.range) * innerHeight
    const baseline = filteredSeries[0].balance
    const changeValue = Number((point.balance - baseline).toFixed(2))
    const percentValue =
      baseline === 0 ? null : Number(((changeValue / baseline) * 100).toFixed(2))
    return {
      point,
      x,
      y: Number.isFinite(y) ? y : chartPadding.top + innerHeight,
      ratio: innerStep === 0 ? 0 : Math.min(1, Math.max(0, (x - chartPadding.left) / innerWidth)),
      change: changeValue,
      percentChange: percentValue
    }
  }, [filteredSeries, hoverIndex, scale, innerWidth, innerHeight, chartPadding])
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
    if (!startDate || !endDate || !minDate || !maxDate) {
      return false
    }
    return startDate !== minDate || endDate !== maxDate
  }, [startDate, endDate, minDate, maxDate])
  const selectionOverlay = useMemo(() => {
    if (
      selectionStartIndex === null ||
      selectionEndIndex === null ||
      filteredSeries.length === 0 ||
      selectionStartIndex < 0 ||
      selectionEndIndex < 0 ||
      selectionStartIndex >= filteredSeries.length ||
      selectionEndIndex >= filteredSeries.length
    ) {
      return null
    }
    const step = filteredSeries.length === 1 ? 0 : innerWidth / (filteredSeries.length - 1)
    const firstIndex = Math.min(selectionStartIndex, selectionEndIndex)
    const lastIndex = Math.max(selectionStartIndex, selectionEndIndex)
    const x1 = chartPadding.left + step * firstIndex
    const x2 = chartPadding.left + step * lastIndex
    return {
      x: x1,
      width: x2 - x1 || 1,
      y: chartPadding.top,
      height: innerHeight
    }
  }, [selectionStartIndex, selectionEndIndex, filteredSeries, chartPadding, innerWidth, innerHeight])
  const variationSummary = useMemo(() => {
    if (filteredSeries.length === 0) {
      return null
    }
    const first = filteredSeries[0]
    const last = filteredSeries[filteredSeries.length - 1]
    const change = Number((last.balance - first.balance).toFixed(2))
    const percentChange =
      first.balance === 0 ? null : Number(((change / first.balance) * 100).toFixed(2))
    return {
      startDate: first.date,
      endDate: last.date,
      startBalance: first.balance,
      endBalance: last.balance,
      change,
      percentChange
    }
  }, [filteredSeries])
  const tooltipPosition = useMemo(() => {
    if (!hoverData) {
      return null
    }
    const clampedLeft = Math.min(95, Math.max(5, (hoverData.x / width) * 100))
    let transform = "translate(-50%, -110%)"
    if (hoverData.ratio < 0.15) {
      transform = "translate(-10%, -110%)"
    } else if (hoverData.ratio > 0.85) {
      transform = "translate(-90%, -110%)"
    }
    return {
      left: `${clampedLeft}%`,
      top: `${(hoverData.y / height) * 100}%`,
      transform
    }
  }, [hoverData, width, height])
  const getIndexFromEvent = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current || filteredSeries.length === 0) {
        return null
      }
      const rect = svgRef.current.getBoundingClientRect()
      const pointerX = ((event.clientX - rect.left) / rect.width) * width
      const normalizedX = pointerX - chartPadding.left
      const clampedX = Math.min(Math.max(normalizedX, 0), innerWidth)
      const step = filteredSeries.length === 1 ? 0 : innerWidth / (filteredSeries.length - 1)
      const index = step === 0 ? 0 : Math.round(clampedX / step)
      const clamped = Math.min(filteredSeries.length - 1, Math.max(0, index))
      return clamped
    },
    [filteredSeries, chartPadding.left, innerWidth, width]
  )
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const index = getIndexFromEvent(event)
      if (index === null) {
        return
      }
      setHoverIndex(index)
      if (isSelecting) {
        setSelectionEndIndex(index)
      }
    },
    [getIndexFromEvent, isSelecting]
  )
  const handlePointerLeave = useCallback(() => {
    setHoverIndex(null)
  }, [])
  useEffect(() => {
    if (filteredSeries.length === 0) {
      setHoverIndex(null)
      return
    }
    setHoverIndex(previous => {
      if (previous === null) {
        return previous
      }
      if (previous < 0 || previous >= filteredSeries.length) {
        return filteredSeries.length - 1
      }
      return previous
    })
  }, [filteredSeries])
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const index = getIndexFromEvent(event)
      if (index === null) {
        return
      }
      event.preventDefault()
      pointerIdRef.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      setIsSelecting(true)
      setSelectionStartIndex(index)
      setSelectionEndIndex(index)
      setHoverIndex(index)
    },
    [getIndexFromEvent]
  )
  const handlePointerUp = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (pointerIdRef.current !== null && event.currentTarget.hasPointerCapture(pointerIdRef.current)) {
        event.currentTarget.releasePointerCapture(pointerIdRef.current)
      }
      pointerIdRef.current = null
      if (!isSelecting || selectionStartIndex === null || selectionEndIndex === null || filteredSeries.length === 0) {
        setIsSelecting(false)
        return
      }
      const firstIndex = Math.min(selectionStartIndex, selectionEndIndex)
      const lastIndex = Math.max(selectionStartIndex, selectionEndIndex)
      const firstDate = filteredSeries[firstIndex].date
      const lastDate = filteredSeries[lastIndex].date
      setStartDate(firstDate)
      setEndDate(lastDate)
      setActiveRange(null)
      setIsSelecting(false)
      setSelectionStartIndex(null)
      setSelectionEndIndex(null)
    },
    [isSelecting, selectionStartIndex, selectionEndIndex, filteredSeries]
  )
  const handleStartChange = useCallback(
    (value: string) => {
      setActiveRange(null)
      setStartDate(value)
      setEndDate(previous => {
        if (!previous || (value && previous < value)) {
          return value
        }
        return previous
      })
    },
    []
  )
  const handleEndChange = useCallback(
    (value: string) => {
      setActiveRange(null)
      setEndDate(value)
      setStartDate(previous => {
        if (!previous || (value && previous > value)) {
          return value
        }
        return previous
      })
    },
    []
  )
  const applyQuickRange = useCallback(
    (range: QuickRange) => {
      if (normalizedSeries.length === 0) {
        return
      }
      const firstDate = parseISO(normalizedSeries[0].date)
      const lastDate = parseISO(normalizedSeries[normalizedSeries.length - 1].date)
      if (range === "ALL") {
        setStartDate(format(firstDate, "yyyy-MM-dd"))
        setEndDate(format(lastDate, "yyyy-MM-dd"))
        setActiveRange(range)
        return
      }
      let computedStart = firstDate
      if (range === "1M") {
        computedStart = subMonths(lastDate, 1)
      } else if (range === "3M") {
        computedStart = subMonths(lastDate, 3)
      } else if (range === "6M") {
        computedStart = subMonths(lastDate, 6)
      } else if (range === "1A") {
        computedStart = subYears(lastDate, 1)
      }
      if (computedStart < firstDate) {
        computedStart = firstDate
      }
      setStartDate(format(computedStart, "yyyy-MM-dd"))
      setEndDate(format(lastDate, "yyyy-MM-dd"))
      setActiveRange(range)
    },
    [normalizedSeries]
  )
  const clearSelection = useCallback(() => {
    if (normalizedSeries.length === 0) {
      return
    }
    setStartDate(normalizedSeries[0].date)
    setEndDate(normalizedSeries[normalizedSeries.length - 1].date)
    setActiveRange(null)
    setSelectionStartIndex(null)
    setSelectionEndIndex(null)
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
    <div
      ref={containerRef}
      className="relative flex w-full flex-col gap-6 overflow-hidden rounded-2xl border border-border/70 bg-card p-6"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Período ativo</span>
            <p className="text-2xl font-semibold text-foreground">{periodLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <div className="flex flex-wrap gap-2 rounded-full bg-muted/50 p-1">
              {quickRanges.map(range => (
                <Button
                  key={range}
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={activeRange === range}
                  className={cn(
                    "h-9 rounded-full px-4 text-xs font-semibold transition",
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
                "h-9 rounded-full border px-4 text-xs font-semibold transition",
                hasRangeFilter
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-dashed border-border text-muted-foreground"
              )}
            >
              Limpar
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Início</span>
              <Input
                type="date"
                className={cn(
                  "h-11 rounded-2xl border border-border bg-background/80 text-sm transition focus-visible:ring-0 sm:w-44",
                  startDate && "border-primary/60 bg-primary/5 text-foreground shadow-sm"
                )}
                value={startDate}
                min={minDate}
                max={endDate || maxDate}
                onChange={event => handleStartChange(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fim</span>
              <Input
                type="date"
                className={cn(
                  "h-11 rounded-2xl border border-border bg-background/80 text-sm transition focus-visible:ring-0 sm:w-44",
                  endDate && "border-primary/60 bg-primary/5 text-foreground shadow-sm"
                )}
                value={endDate}
                min={startDate || minDate}
                max={maxDate}
                onChange={event => handleEndChange(event.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="relative w-full">
        {variationSummary && (
          <div className="pointer-events-none absolute right-4 top-4 z-10 min-w-[160px] rounded-2xl border border-border/70 bg-background/90 px-4 py-3 text-right text-xs shadow-lg backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Variação</p>
            <p
              className={cn(
                "text-lg font-semibold",
                variationSummary.change >= 0 ? "text-emerald-400" : "text-destructive"
              )}
            >
              {formatSignedCurrency(variationSummary.change)}
            </p>
            {variationSummary.percentChange !== null && (
              <p className="text-sm font-medium text-foreground">{formatSignedPercent(variationSummary.percentChange)}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {format(parseISO(variationSummary.startDate), "dd/MM")} — {format(parseISO(variationSummary.endDate), "dd/MM")}
            </p>
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-80 w-full text-primary"
          aria-label="Evolução do saldo"
          role="img"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerLeave={handlePointerLeave}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            <linearGradient id="balance-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {yScale && (
            <g>
              {yScale.ticks.map((value, index) => {
                const position =
                  chartPadding.top +
                  innerHeight -
                  ((value - yScale.min) / yScale.range) * innerHeight
                const isZero = Math.abs(value) < 0.0001
                return (
                  <g key={`${value}-${index}`}>
                    <line
                      x1={chartPadding.left}
                      x2={width - chartPadding.right}
                      y1={position}
                      y2={position}
                      stroke="hsl(var(--border))"
                      strokeWidth={isZero ? 2 : 1}
                      strokeDasharray={isZero ? undefined : "2 6"}
                      opacity={isZero ? 0.8 : 0.25}
                    />
                    <text
                      x={chartPadding.left - 8}
                      y={position}
                      fill="hsl(var(--muted-foreground))"
                      fontSize={11}
                      textAnchor="end"
                      dominantBaseline="middle"
                    >
                      {formatBalance(value)}
                    </text>
                  </g>
                )
              })}
            </g>
          )}
          {selectionOverlay && (
            <>
              <rect
                x={selectionOverlay.x}
                y={selectionOverlay.y}
                width={selectionOverlay.width}
                height={selectionOverlay.height}
                fill="hsl(var(--primary))"
                opacity={0.12}
              />
              <line
                x1={selectionOverlay.x}
                x2={selectionOverlay.x}
                y1={selectionOverlay.y}
                y2={selectionOverlay.y + selectionOverlay.height}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                opacity={0.4}
              />
              <line
                x1={selectionOverlay.x + selectionOverlay.width}
                x2={selectionOverlay.x + selectionOverlay.width}
                y1={selectionOverlay.y}
                y2={selectionOverlay.y + selectionOverlay.height}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                opacity={0.4}
              />
            </>
          )}
          <path d={area} fill="url(#balance-gradient)" />
          <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={3} strokeLinecap="round" />
          {hoverData && (
            <>
              <line
                x1={hoverData.x}
                x2={hoverData.x}
                y1={chartPadding.top}
                y2={chartPadding.top + innerHeight}
                stroke="hsl(var(--primary))"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <circle cx={hoverData.x} cy={hoverData.y} r={5} fill="hsl(var(--primary))" />
              <circle cx={hoverData.x} cy={hoverData.y} r={10} fill="hsl(var(--primary))" opacity={0.2} />
            </>
          )}
        </svg>
        {hoverData && tooltipPosition && (
          <div
            className="pointer-events-none absolute min-w-[180px] rounded-lg border border-border bg-background/95 px-4 py-3 text-xs shadow-xl backdrop-blur"
            style={tooltipPosition}
          >
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">
              {format(parseISO(hoverData.point.date), "dd/MM/yyyy")}
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {formatBalance(hoverData.point.balance)}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Variação</span>
              <span className={hoverData.change >= 0 ? "text-emerald-400" : "text-destructive"}>
                {formatSignedCurrency(hoverData.change)}
              </span>
            </div>
            {hoverData.percentChange !== null && (
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Percentual</span>
                <span className={hoverData.percentChange >= 0 ? "text-emerald-400" : "text-destructive"}>
                  {formatSignedPercent(hoverData.percentChange)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {labels.map(label => (
          <span key={label}>{format(parseISO(label), "dd/MM")}</span>
        ))}
      </div>
    </div>
  )
}

