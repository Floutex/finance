import { SpreadsheetDashboard } from "@/components/spreadsheet-dashboard"

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Finanças do Casal</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe lançamentos compartilhados, saldo e quem está devendo no momento.
        </p>
      </header>
      <SpreadsheetDashboard />
    </main>
  )
}

