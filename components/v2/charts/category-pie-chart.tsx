"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/v2/primitives/button"
import { Currency } from "@/components/v2/finance/currency"
import { categoryChartPalette, formatCurrency } from "@/lib/v2/tokens"
import { cn } from "@/components/v2/primitives/utils"

export type CategoryTotal = {
  category: string
  total: number
  /** Drill-down only: the transaction's date (yyyy-MM-dd)… */
  date?: string
  /** …and who paid it. Both render as a minimal meta line on the row. */
  who?: string
}

const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
]

/** "2026-06-14" → "14 jun". Parsed by parts to dodge timezone drift. */
function formatShortDate(iso?: string): string | null {
  if (!iso) return null
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return null
  return `${d} ${MONTHS_PT[m - 1]}`
}

/** Joins date + payer into one muted line: "14 jun · Maria". */
function rowMeta(row: CategoryTotal): string | null {
  const parts = [formatShortDate(row.date), row.who?.trim() || null].filter(
    Boolean
  )
  return parts.length ? parts.join(" · ") : null
}

const ECharts = dynamic(() => import("./echarts-runtime"), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 w-full items-center justify-center text-[12px] italic text-muted-foreground">
      carregando gráfico…
    </div>
  ),
})

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
  const echartsRef = React.useRef<any>(null)

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

    // Coalesce duplicates and case-variants of "Outros" / "Sem categoria"
    // so the user's literal "Outros" category never collides with the
    // synthetic bucket we add when there are more slices than maxSlices.
    const isOthers = (c: string) => {
      const k = c.trim().toLowerCase()
      return k === "outros" || k === "outro" || k === "outras"
    }

    const merged = new Map<string, { total: number; row: CategoryTotal }>()
    let existingOthers = 0
    for (const item of sourceData) {
      if (isOthers(item.category)) {
        existingOthers += item.total
      } else {
        const prev = merged.get(item.category)
        if (prev) {
          prev.total += item.total
        } else {
          merged.set(item.category, { total: item.total, row: item })
        }
      }
    }
    const sorted = Array.from(merged.values())
      .map((x) => ({ ...x.row, total: x.total }))
      .sort((a, b) => b.total - a.total)

    let slices: CategoryTotal[]
    if (sorted.length <= maxSlices - (existingOthers > 0 ? 1 : 0)) {
      slices = sorted
      if (existingOthers > 0) {
        slices.push({ category: "Outros", total: existingOthers })
      }
    } else {
      const top = sorted.slice(0, maxSlices - 1)
      const rest = sorted.slice(maxSlices - 1)
      const restTotal =
        rest.reduce((s, x) => s + x.total, 0) + existingOthers
      slices = [...top, { category: "Outros", total: restTotal }]
    }
    const total = slices.reduce((s, x) => s + x.total, 0)
    return { slices, total }
  }, [sourceData, maxSlices])

  const isDrilling = selected !== null
  const clickable = !isDrilling && !!drilldownFor

  const handleSliceClick = (slice: CategoryTotal) => {
    if (!clickable) return
    if (slice.category === "Outros") return
    setSelected(slice.category)
  }

  const handleChartReady = React.useCallback((instance: any) => {
    echartsRef.current = instance
  }, [])

  const handleMouseEnterRow = (index: number) => {
    if (!echartsRef.current) return
    echartsRef.current.dispatchAction({
      type: "highlight",
      dataIndex: index,
    })
    echartsRef.current.dispatchAction({
      type: "showTip",
      dataIndex: index,
      seriesIndex: 0,
    })
  }

  const handleMouseLeaveRow = (index: number) => {
    if (!echartsRef.current) return
    echartsRef.current.dispatchAction({
      type: "downplay",
      dataIndex: index,
    })
    echartsRef.current.dispatchAction({
      type: "hideTip",
    })
  }

  const pieOption = React.useMemo(() => {
    return {
      animationDuration: 400,
      animationEasing: "quartOut",
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(18, 18, 22, 0.96)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: "#e4e4e7", fontSize: 12 },
        formatter: (params: { dataIndex: number; name: string; value: number; percent: number }) => {
          if (!params || !params.name) return ""
          const slice = slices[params.dataIndex]
          const meta = slice ? rowMeta(slice) : null
          const pct = total > 0 ? ((params.value / total) * 100).toFixed(1) : "0"
          const formattedCurrency = formatCurrency(params.value)

          let html = `<div style="font-weight:600;color:#fafafa;margin-bottom:3px">${params.name}</div>`
          html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">`
          html += `<span style="font-family:ui-monospace,monospace;color:#ffffff;font-weight:600">${formattedCurrency}</span>`
          html += `<span style="color:#a1a1aa;font-size:11px">${pct}%</span>`
          html += `</div>`

          if (meta) {
            html += `<div style="margin-top:4px;font-size:10px;color:#a1a1aa">${meta}</div>`
          }

          if (clickable && params.name !== "Outros") {
            html += `<div style="margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.08);font-size:10.5px;color:#71717a">Clique para detalhar</div>`
          }

          return html
        },
      },
      color: categoryChartPalette,
      series: [
        {
          type: "pie",
          radius: ["62%", "86%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 3,
            borderColor: "#16161a",
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
          emphasis: {
            scale: true,
            scaleSize: 4,
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.6)",
            },
          },
          data: slices.map((s) => ({
            name: s.category,
            value: s.total,
          })),
        },
      ],
    }
  }, [slices, total, clickable])

  const onChartEvents = React.useMemo(
    () => ({
      click: (params: { name?: string }) => {
        if (!clickable || !params?.name) return
        if (params.name === "Outros") return
        const target = slices.find((s) => s.category === params.name)
        if (target) handleSliceClick(target)
      },
    }),
    [clickable, slices]
  )

  return (
    <div className={cn("surface-1 flex flex-col gap-4 rounded-lg p-5", className)}>
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
        {isDrilling ? (
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
        ) : (
          clickable &&
          slices.length > 0 && (
            <span className="hidden text-[11px] text-muted-foreground sm:inline-block">
              clique na fatia para detalhar
            </span>
          )
        )}
      </header>

      {total === 0 ? (
        <div className="flex h-44 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          {isDrilling ? "Sem transações nessa categoria" : "Sem dados no período"}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <div className="relative size-36 shrink-0 sm:size-40">
            <ECharts
              option={pieOption}
              style={{ height: "100%", width: "100%" }}
              notMerge
              lazyUpdate
              opts={{ renderer: "canvas" }}
              onEvents={onChartEvents}
              onChartReady={handleChartReady}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
                Total
              </span>
              <Currency
                value={total}
                className="max-w-[90px] truncate text-xs font-semibold tracking-tight text-foreground sm:max-w-[100px]"
              />
            </div>
          </div>

          <ul className="flex min-w-0 flex-1 w-full flex-col gap-1 text-xs">
            {slices.map((s, i) => {
              const pct = total > 0 ? (s.total / total) * 100 : 0
              const isClickableRow = clickable && s.category !== "Outros"
              const meta = rowMeta(s)
              const color =
                categoryChartPalette[i % categoryChartPalette.length]
              return (
                <li key={`${s.category}-${i}`}>
                  <button
                    type="button"
                    disabled={!isClickableRow}
                    onClick={() => isClickableRow && handleSliceClick(s)}
                    onMouseEnter={() => handleMouseEnterRow(i)}
                    onMouseLeave={() => handleMouseLeaveRow(i)}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-sm px-1.5 py-0.5 text-left transition-colors",
                      isClickableRow
                        ? "cursor-pointer hover:bg-accent/40"
                        : "cursor-default"
                    )}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground group-hover:text-foreground">
                      {s.category}
                    </span>
                    {meta && (
                      <span className="hidden xl:inline shrink-0 text-[10px] text-muted-foreground">
                        {meta}
                      </span>
                    )}
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {pct.toFixed(0)}%
                    </span>
                    <Currency
                      value={s.total}
                      className="shrink-0 text-right text-xs font-medium tabular-nums text-foreground"
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
