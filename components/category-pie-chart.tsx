import { memo, useMemo, useState } from "react"
import { getUserColors } from "@/components/ui/utils"

type CategoryTotal = {
  category: string
  total: number
}

const pieCurrencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const formatCurrency = (value: number) => pieCurrencyFormatter.format(value)

const colors = getUserColors()

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

function CategoryPieChartImpl(props: { data: CategoryTotal[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

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

      currentAngle = endAngle

      return {
        ...slice,
        category: item.category,
        total: item.total,
        percentage,
        color: colors[index % colors.length],
        index,
      }
    })
  }, [props.data, total])

  if (props.data.length === 0 || total === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
        Nenhuma transação no período
      </div>
    )
  }

  const hoveredSlice = hoveredIndex !== null ? slices[hoveredIndex] : null

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 300 300"
        className="w-full"
        style={{ aspectRatio: "1 / 1", maxHeight: "400px" }}
        aria-label="Gráfico de pizza por categoria"
        role="img"
      >
        {slices.map((slice, index) => (
          <path
            key={slice.category}
            d={slice.path}
            fill={slice.color}
            opacity={hoveredIndex !== null && hoveredIndex !== index ? 0.5 : 1}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            style={{
              cursor: "pointer",
              transition: "opacity 0.2s"
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(prev => (prev === index ? null : prev))}
          />
        ))}
      </svg>

      {hoveredSlice && (
        <div
          className="pointer-events-none absolute z-30 min-w-[180px] rounded-lg border border-border bg-black/80 px-3 py-2.5 shadow-xl backdrop-blur sm:px-4 sm:py-3"
          style={{
            left: `${(hoveredSlice.labelX / 300) * 100}%`,
            top: `${(hoveredSlice.labelY / 300) * 100}%`,
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

export const CategoryPieChart = memo(CategoryPieChartImpl)
