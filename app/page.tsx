"use client"

import { useState } from "react"
import { SpreadsheetDashboard } from "@/components/spreadsheet-dashboard"
import { AccessControl } from "@/components/access-control"

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  if (!currentUser) {
    return <AccessControl onLogin={setCurrentUser} />
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Finanças Compartilhadas</h1>
          <p className="text-sm text-muted-foreground">
            Logado como <span className="font-medium text-foreground">{currentUser}</span>
          </p>
        </div>
        <button
          onClick={() => setCurrentUser(null)}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Sair
        </button>
      </header>
      <SpreadsheetDashboard currentUser={currentUser} />
    </main>
  )
}

