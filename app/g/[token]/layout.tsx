"use client"

import * as React from "react"
import { use } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ListOrdered, Loader2, RefreshCcw } from "lucide-react"

import { Button } from "@/components/v2/primitives/button"
import { ParticipantAvatar } from "@/components/v2/finance/participant-avatar"
import { cn } from "@/components/v2/primitives/utils"
import {
  GuestProvider,
  useGuestContext,
  type GuestState,
} from "@/components/v2/guest/guest-context"

export default function GuestLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [state, setState] = React.useState<GuestState | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchState = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/guest/${token}/state`, { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha")
      setState(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha")
    } finally {
      setLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    fetchState()
  }, [fetchState])

  if (loading && !state) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !state) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="space-y-4 text-center">
          <p className="font-display text-2xl font-semibold">
            Não foi possível carregar
          </p>
          <p className="text-sm text-muted-foreground">
            {error ?? "Link inválido"}
          </p>
          <Button variant="outline" onClick={fetchState}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <GuestProvider token={token} initialState={state}>
      <GuestShell>{children}</GuestShell>
    </GuestProvider>
  )
}

function GuestShell({ children }: { children: React.ReactNode }) {
  const { token, state, refreshing, refresh } = useGuestContext()
  const pathname = usePathname()
  const { participant } = state

  const dashHref = `/g/${token}`
  const txHref = `/g/${token}/transactions`
  const onTransactions = pathname?.endsWith("/transactions")

  return (
    <div className="min-h-screen pb-24">
      <header
        className="px-4 pb-6 pt-8 md:px-8 md:pb-8 md:pt-10"
        style={{
          background: `radial-gradient(circle at top, ${participant.color}22 0%, transparent 65%)`,
        }}
      >
        <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ParticipantAvatar
                name={participant.name}
                hex={participant.color}
                size="lg"
                className="size-12"
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Convidado
                </p>
                <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
                  {participant.name}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={refresh}
                disabled={refreshing}
                aria-label="Atualizar"
              >
                {refreshing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="size-3.5" />
                )}
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            </div>
          </div>

          <nav className="-mb-2 flex items-center gap-1 overflow-x-auto">
            <GuestTab href={dashHref} active={!onTransactions} icon={<LayoutDashboard className="size-3.5" />}>
              Dashboard
            </GuestTab>
            <GuestTab href={txHref} active={!!onTransactions} icon={<ListOrdered className="size-3.5" />}>
              Transações
            </GuestTab>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[88rem] px-4 md:px-8">{children}</main>
    </div>
  )
}

function GuestTab({
  href,
  active,
  icon,
  children,
}: {
  href: string
  active: boolean
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </Link>
  )
}
