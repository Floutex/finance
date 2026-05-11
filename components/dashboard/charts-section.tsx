"use client"

import { memo, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { CategoryPieChart } from "@/components/category-pie-chart"
import { ChartSkeleton } from "@/components/dashboard/chart-skeleton"
import { formatCurrency } from "@/lib/constants"

const BalanceChart = dynamic(
  () => import("@/components/balance-chart").then(m => ({ default: m.BalanceChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

interface CategoryTotal {
  category: string
  total: number
}

interface ChartsSectionProps {
  categoryTotals: CategoryTotal[]
  totalCategoryAmount: number
  globalCategoryTotals: CategoryTotal[]
  totalGlobalCategoryAmount: number
  topTransactions: CategoryTotal[]
  totalTopTransactions: number
  chartSeries: Array<{ date: string; balance: number }>
  currentUser: string
  startDate?: string
  endDate?: string
}

// Só monta o filho quando o wrapper entra na viewport.
// recharts é pesado e fica abaixo das pizzas — em mobile costuma carregar fora da tela.
function LazyOnVisible({ children, minHeight = 320 }: { children: React.ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  return (
    <div ref={ref} style={{ minHeight }}>
      {visible ? children : <ChartSkeleton />}
    </div>
  )
}

function ChartsSectionImpl({
  categoryTotals,
  totalCategoryAmount,
  globalCategoryTotals,
  totalGlobalCategoryAmount,
  topTransactions,
  totalTopTransactions,
  chartSeries,
  currentUser,
  startDate,
  endDate,
}: ChartsSectionProps) {
  return (
    <>
      <Card className="overflow-hidden animate-blur-in [animation-delay:150ms]">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/50">
          <div className="flex flex-col items-center p-4">
            <p className="text-sm font-medium mb-1">Meus Gastos por Categoria</p>
            <div className="w-full max-w-[220px]">
              <CategoryPieChart data={categoryTotals} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total: <AnimatedNumber value={totalCategoryAmount} formatFn={formatCurrency} animateOnMount delay={150} />
            </p>
          </div>

          <div className="flex flex-col items-center p-4">
            <p className="text-sm font-medium mb-1">Gastos por Categoria (Geral)</p>
            <div className="w-full max-w-[220px]">
              <CategoryPieChart data={globalCategoryTotals} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total: <AnimatedNumber value={totalGlobalCategoryAmount} formatFn={formatCurrency} animateOnMount delay={200} />
            </p>
          </div>

          <div className="flex flex-col items-center p-4">
            <p className="text-sm font-medium mb-1">Maiores Transações</p>
            <div className="w-full max-w-[220px]">
              <CategoryPieChart data={topTransactions} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Soma: <AnimatedNumber value={totalTopTransactions} formatFn={formatCurrency} animateOnMount delay={250} />
            </p>
          </div>
        </div>
      </Card>

      <div className="animate-rise-up [animation-delay:300ms]">
        <LazyOnVisible>
          <BalanceChart series={chartSeries} currentUser={currentUser} startDate={startDate} endDate={endDate} />
        </LazyOnVisible>
      </div>
    </>
  )
}

export const ChartsSection = memo(ChartsSectionImpl)
