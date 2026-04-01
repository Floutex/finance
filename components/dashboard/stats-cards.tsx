"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { cn } from "@/components/ui/utils"
import { formatCurrency } from "@/lib/constants"
import { TrendingUp, Wallet } from "lucide-react"

interface StatsCardsProps {
  totalBalance: number
  mySpend: number
  totalSpend: number
}

export function StatsCards({ totalBalance, mySpend, totalSpend }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card
        variant="highlight"
        className="relative overflow-hidden group animate-scale-in"
      >
        <div className={`absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-10 blur-3xl transition-all duration-500 group-hover:opacity-20 ${totalBalance >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
          <Wallet className={`h-4 w-4 ${totalBalance >= 0 ? "text-emerald-500" : "text-red-500"}`} />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            <AnimatedNumber
              value={totalBalance}
              formatFn={formatCurrency}
              animateOnMount
              duration={1200}
              className={cn(
                "text-3xl font-bold tracking-tight transition-all duration-300 md:text-4xl",
                totalBalance >= 0 ? "text-emerald-500" : "text-red-500"
              )}
            />
            <p className="text-xs text-muted-foreground">
              {totalBalance > 0
                ? "Você tem a receber • Balanço geral de dívidas"
                : totalBalance < 0
                  ? "Você deve no total • Balanço geral de dívidas"
                  : "Tudo quitado • Balanço zerado"
              }
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-slide-right [animation-delay:300ms]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Gasto</CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold"><AnimatedNumber value={mySpend} formatFn={formatCurrency} animateOnMount duration={1000} delay={300} /></div>
          <p className="text-xs text-muted-foreground">Você pagou no período selecionado</p>
          <div className="mt-3 h-1 w-full rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min((mySpend / (totalSpend || 1)) * 100, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground text-right">
            {Math.round((mySpend / (totalSpend || 1)) * 100)}% do total (<AnimatedNumber value={totalSpend} formatFn={formatCurrency} animateOnMount delay={300} />)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
