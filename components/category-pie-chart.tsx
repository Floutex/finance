"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { cn } from "@/components/ui/utils"

type CategoryTotal = {
  category: string
  total: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const colors = [
  "hsl(var(--primary))",
  "hsl(142, 71%, 45%)",
  "hsl(199, 89%, 48%)",
  "hsl(43, 96%, 56%)",
  "hsl(330, 81%, 60%)",
  "hsl(280, 100%, 70%)",
  "hsl(0, 72%, 51%)",
  "hsl(210, 100%, 56%)"
]

const calculatePieSlice = (
  startAngle: number,
  endAngle: number,
  radius: number,
  centerX: number,
  centerY: number
) => {
  const startAngleRad = (startAngle * Math.PI) / 180
  const endAngleRad = (endAngle * Math.PI) / 180

  const x1 = centerX + radius * Math.cos(startAngleRad)
  const y1 = centerY + radius * Math.sin(startAngleRad)
  const x2 = centerX + radius * Math.cos(endAngleRad)
  const y2 = centerY + radius * Math.sin(endAngleRad)

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

  const pathData = [
    `M ${centerX} ${centerY}`,
    `L ${x1} ${y1}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    "Z"
  ].join(" ")

  const midAngle = (startAngle + endAngle) / 2
  const midAngleRad = (midAngle * Math.PI) / 180
  const labelRadius = radius * 0.7
  const labelX = centerX + labelRadius * Math.cos(midAngleRad)
  const labelY = centerY + labelRadius * Math.sin(midAngleRad)

  return {
    path: pathData,
    labelX,
    labelY,
    midAngle
  }
}

export const CategoryPieChart = (props: { data: CategoryTotal[] }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  const total = useMemo(() => {
    return props.data.reduce((sum, item) => sum + item.total, 0)
  }, [props.data])

  const slices = useMemo(() => {
    if (props.data.length === 0 || total === 0) {
      return []
    }

    const radius = 120
    const centerX = 150
    const centerY = 150

    let currentAngle = -90

    return props.data.map((item, index) => {
      const percentage = (item.total / total) * 100
      const angle = (item.total / total) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle

      const slice = calculatePieSlice(startAngle, endAngle, radius, centerX, centerY)

      const normalizedStartAngle = (startAngle + 90 + 360) % 360
      const normalizedEndAngle = (endAngle + 90 + 360) % 360

      currentAngle = endAngle

      return {
        ...slice,
        category: item.category,
        total: item.total,
        percentage,
        color: colors[index % colors.length],
        index,
        startAngle: normalizedStartAngle,
        endAngle: normalizedEndAngle
      }
    })
  }, [props.data, total])

  const getIndexFromEvent = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || slices.length === 0) {
        return null
      }
      const rect = svgRef.current.getBoundingClientRect()
      const viewBox = { x: 0, y: 0, width: 300, height: 300 }

      const scaleX = viewBox.width / rect.width
      const scaleY = viewBox.height / rect.height

      const svgX = (event.clientX - rect.left) * scaleX
      const svgY = (event.clientY - rect.top) * scaleY

      const centerX = 150
      const centerY = 150
      const radius = 120

      const dx = svgX - centerX
      const dy = svgY - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > radius) {
        return null
      }

      let angle = (Math.atan2(dy, dx) * 180) / Math.PI
      angle = (angle + 90 + 360) % 360

      for (let i = 0; i < slices.length; i++) {
        const slice = slices[i]
        const sliceStart = slice.startAngle
        const sliceEnd = slice.endAngle

        if (sliceStart <= sliceEnd) {
          if (angle >= sliceStart && angle < sliceEnd) {
            return i
          }
        } else {
          if (angle >= sliceStart || angle < sliceEnd) {
            return i
          }
        }
      }

      return null
    },
    [slices]
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const index = getIndexFromEvent(event)
      if (index !== null) {
        setHoveredIndex(index)
        const rect = svgRef.current?.getBoundingClientRect()
        if (rect) {
          const viewBox = { width: 300, height: 300 }
          const scaleX = viewBox.width / rect.width
          const scaleY = viewBox.height / rect.height
          setTooltipPosition({
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
          })
        }
      } else {
        setHoveredIndex(null)
        setTooltipPosition(null)
      }
    },
    [getIndexFromEvent]
  )

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null)
    setTooltipPosition(null)
  }, [])

  if (props.data.length === 0 || total === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
        Nenhuma transação no período
      </div>
    )
  }

  const hoveredSlice = hoveredIndex !== null ? slices[hoveredIndex] : null

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        viewBox="0 0 300 300"
        className="w-full"
        style={{ aspectRatio: "1 / 1", maxHeight: "400px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-label="Gráfico de pizza por categoria"
        role="img"
      >
        {slices.map((slice, index) => (
          <g key={slice.category}>
            <path
              d={slice.path}
              fill={slice.color}
              opacity={hoveredIndex !== null && hoveredIndex !== index ? 0.5 : 1}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              style={{
                cursor: "pointer",
                transition: "opacity 0.2s"
              }}
            />
          </g>
        ))}
      </svg>

      {hoveredSlice && tooltipPosition && (
        <div
          className="pointer-events-none absolute z-30 min-w-[180px] rounded-lg border border-border bg-black/80 px-3 py-2.5 shadow-xl backdrop-blur sm:px-4 sm:py-3"
          style={{
            left: `${(tooltipPosition.x / 300) * 100}%`,
            top: `${(tooltipPosition.y / 300) * 100}%`,
            transform: "translate(-50%, -110%)"
          }}
          role="tooltip"
        >
          <div className="text-sm font-semibold text-foreground">{hoveredSlice.category}</div>
          <div className="mt-1 text-base font-bold text-foreground">{formatCurrency(hoveredSlice.total)}</div>
          <div className="mt-1.5 text-xs text-muted-foreground">{hoveredSlice.percentage.toFixed(1)}% do total</div>
        </div>
      )}
    </div>
  )
}

