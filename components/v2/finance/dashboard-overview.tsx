"use client"

import * as React from "react"
import { Receipt, Tag, Wallet } from "lucide-react"

import type { DashboardMetrics } from "@/lib/v2/dashboard-metrics"

import { MetricCard } from "@/components/v2/finance/metric-card"
import { BalanceCard } from "@/components/v2/finance/balance-card"
import { BalanceChart } from "@/components/v2/charts/balance-chart"
import { CategoryPieChart } from "@/components/v2/charts/category-pie-chart"
import { LazyMount } from "@/components/v2/charts/lazy-mount"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export type DashboardOverviewProps = {
  metrics: DashboardMetrics
  /** Current user name, used to filter the "Você por categoria" drilldowns. */
  currentUser: string
  effectiveFilters: { start?: string; end?: string }
  daysInPeriod: number
}

/**
 * Top-half of any dashboard: balance hero + period stats + category pies +
 * balance time series. Pure presentation — feed it the computed metrics.
 */
export function DashboardOverview({
  metrics,
  currentUser,
  effectiveFilters,
  daysInPeriod,
}: DashboardOverviewProps) {
  const dailyAverage =
    daysInPeriod > 0 ? metrics.periodStats.totalSpend / daysInPeriod : 0

  return (
    <>
      <BalanceCard totalBalance={metrics.totalBalance} />

      <section className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&>*]:min-w-[78%] [&>*]:snap-start md:[&>*]:min-w-0">
        <MetricCard
          label="Gastos no período"
          value={metrics.periodStats.totalSpend}
          icon={<Receipt />}
          hint={`${metrics.periodStats.transactionCount} transações`}
        />
        <MetricCard
          label="Você pagou"
          value={metrics.periodStats.mySpend}
          icon={<Wallet />}
          hint={
            metrics.periodStats.totalSpend > 0
              ? `${Math.round(
                  (metrics.periodStats.mySpend / metrics.periodStats.totalSpend) *
                    100
                )}% do total`
              : "Sem transações no período"
          }
        />
        <MetricCard
          label="Top categoria"
          icon={<Tag />}
          hint={
            metrics.topCategory && metrics.periodStats.totalSpend > 0
              ? `${brl.format(metrics.topCategory.total)} · ${Math.round(
                  (metrics.topCategory.total / metrics.periodStats.totalSpend) *
                    100
                )}% do total`
              : "Sem dados no período"
          }
        >
          <span
            className="truncate font-display text-3xl font-semibold"
            title={metrics.topCategory?.category}
          >
            {metrics.topCategory?.category ?? "—"}
          </span>
        </MetricCard>
        <MetricCard
          label="Média diária"
          icon={<Receipt />}
          value={dailyAverage}
          hint={
            daysInPeriod > 0
              ? `Em ${daysInPeriod} ${daysInPeriod === 1 ? "dia" : "dias"} do período`
              : "Sem período definido"
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LazyMount minHeight={300}>
          <CategoryPieChart
            title="Você por categoria"
            description="Gastos pagos por você no período"
            data={metrics.categoryTotals}
            drilldownFor={(category) =>
              metrics.filteredTransactions
                .filter(
                  (t) =>
                    t.paid_by === currentUser &&
                    (t.category?.trim() || "Sem categoria") === category
                )
                .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
                .slice(0, 8)
                .map((t) => ({
                  category: t.description?.trim() || "Sem descrição",
                  total: t.amount ?? 0,
                  date: t.date,
                }))
            }
          />
        </LazyMount>
        <LazyMount minHeight={300}>
          <CategoryPieChart
            title="Grupo por categoria"
            description="Todas as transações em que você está envolvido"
            data={metrics.globalCategoryTotals}
            drilldownFor={(category) =>
              metrics.filteredTransactions
                .filter(
                  (t) => (t.category?.trim() || "Sem categoria") === category
                )
                .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
                .slice(0, 8)
                .map((t) => ({
                  category: t.description?.trim() || "Sem descrição",
                  total: t.amount ?? 0,
                  date: t.date,
                  who: t.paid_by,
                }))
            }
          />
        </LazyMount>
      </section>

      <LazyMount minHeight={336}>
        <BalanceChart
          series={metrics.chartSeries}
          dailyBreakdown={metrics.dailyBreakdown}
          startDate={effectiveFilters.start}
          endDate={effectiveFilters.end}
        />
      </LazyMount>
    </>
  )
}
