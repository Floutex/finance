"use client"

import { Card } from "@/components/ui/card"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { CategoryPieChart } from "@/components/category-pie-chart"
import { BalanceChart } from "@/components/balance-chart"
import { formatCurrency } from "@/lib/constants"

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

export function ChartsSection({
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
        <BalanceChart series={chartSeries} currentUser={currentUser} startDate={startDate} endDate={endDate} />
      </div>
    </>
  )
}
