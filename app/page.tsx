"use client"

import { useState } from "react"
import { SpreadsheetDashboard } from "@/components/spreadsheet-dashboard"
import { AccessControl } from "@/components/access-control"
import { IncomeManager } from "@/components/income-manager"
import { getUserGradient } from "@/components/ui/utils"
// Import cache module to trigger prefetching of transactions in background
import "@/lib/transactions-cache"

export const dynamic = 'force-dynamic'

const INCOME_USERS = ["Antônio", "Júlia"]

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [view, setView] = useState<"dashboard" | "income">("dashboard")

  return (
    <>
      {!currentUser ? (
        <AccessControl onLogin={(user) => { setCurrentUser(user); setView("dashboard") }} />
      ) : (
        <div className={`min-h-screen transition-colors duration-500 ${getUserGradient(currentUser)}`}>
          <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-10">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-slide-up">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground/60 bg-clip-text text-transparent">
                  {(() => {
                    const hour = new Date().getHours()
                    if (hour < 12) return "Bom dia,"
                    if (hour < 18) return "Boa tarde,"
                    return "Boa noite,"
                  })()} {currentUser}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Visão geral das suas finanças
                </p>
              </div>
              <div className="flex items-center gap-4">
                {INCOME_USERS.includes(currentUser) && (
                  <button
                    onClick={() => setView(view === "dashboard" ? "income" : "dashboard")}
                    className="group relative overflow-hidden rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-white/20 hover:bg-black/40 hover:text-foreground"
                  >
                    <span className="relative z-10">
                      {view === "dashboard" ? "Ganho Mensal" : "Dashboard"}
                    </span>
                  </button>
                )}
                <div className={`hidden md:flex h-10 w-10 items-center justify-center rounded-full border border-white/10 shadow-inner ${getUserGradient(currentUser)}`}>
                  <span className="font-bold text-white text-lg">{currentUser.charAt(0)}</span>
                </div>
                <button
                  onClick={() => setCurrentUser(null)}
                  className="group relative overflow-hidden rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-white/20 hover:bg-black/40 hover:text-foreground"
                >
                  <span className="relative z-10">Sair</span>
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </button>
              </div>
            </header>
            {view === "dashboard" ? (
              <SpreadsheetDashboard currentUser={currentUser} />
            ) : (
              <IncomeManager currentUser={currentUser} onBack={() => setView("dashboard")} />
            )}
          </main>
        </div>
      )}
    </>
  )
}
