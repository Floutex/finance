"use client"

import * as React from "react"
import { use } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowRight, HandCoins, Loader2, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/v2/primitives/button"
import { Skeleton } from "@/components/v2/primitives/skeleton"
import { Currency } from "@/components/v2/finance/currency"
import { ParticipantAvatar } from "@/components/v2/finance/participant-avatar"
import { ParticipantBadge } from "@/components/v2/finance/participant-badge"
import { GuestPaybackDialog } from "@/components/v2/guest/guest-payback-dialog"

type Participant = {
  id: string
  name: string
  color: string
  kind: string
  is_archived: boolean
}

type Transaction = {
  id: string
  description: string
  category: string | null
  date: string
  amount: number | null
  paid_by: string
  participants: string[] | null
  receipt_url: string | null
}

type Debt = { from: string; to: string; amount: number }

type State = {
  participant: Participant
  members: Participant[]
  transactions: Transaction[]
  debts: Debt[]
}

export default function GuestPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [state, setState] = React.useState<State | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [paybackOpen, setPaybackOpen] = React.useState(false)

  const refresh = React.useCallback(async () => {
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
    refresh()
  }, [refresh])

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
          <p className="font-display text-2xl font-semibold">Não foi possível carregar</p>
          <p className="text-sm text-muted-foreground">{error ?? "Link inválido"}</p>
          <Button variant="outline" onClick={refresh}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  const { participant, members, transactions, debts } = state
  const allParticipants = [participant, ...members]

  let balance = 0
  for (const d of debts) {
    if (d.from === participant.name) balance -= d.amount
    else if (d.to === participant.name) balance += d.amount
  }

  return (
    <div className="min-h-screen pb-20">
      <header
        className="px-6 py-10"
        style={{
          background: `radial-gradient(circle at top, ${participant.color}22 0%, transparent 60%)`,
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <ParticipantAvatar
            name={participant.name}
            hex={participant.color}
            size="lg"
            className="size-14"
          />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Olá,
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {participant.name}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6">
        <section className="surface-2 flex flex-col gap-4 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Seu saldo
              </p>
              <Currency
                value={balance}
                display
                signed
                className="mt-1 text-4xl"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={refresh}
                disabled={loading}
                aria-label="Atualizar"
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="size-3.5" />
                )}
                Atualizar
              </Button>
              <Button onClick={() => setPaybackOpen(true)}>
                <HandCoins />
                Pagar
              </Button>
            </div>
          </div>

          {debts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tudo certo — sem dívidas pendentes.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {debts.map((d, i) => {
                const isPayer = d.from === participant.name
                const counterpart = isPayer ? d.to : d.from
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {isPayer ? (
                        <>
                          Você deve a <strong>{counterpart}</strong>
                        </>
                      ) : (
                        <>
                          <strong>{counterpart}</strong> te deve
                        </>
                      )}
                    </span>
                    <Currency
                      value={d.amount}
                      className={
                        isPayer ? "text-destructive" : "text-success"
                      }
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="surface-1 overflow-hidden rounded-2xl">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-semibold">Transações onde você aparece</p>
            <p className="text-xs text-muted-foreground">
              {transactions.length} {transactions.length === 1 ? "registro" : "registros"}
            </p>
          </div>
          {transactions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhuma transação ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {format(parseISO(t.date), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                      <span aria-hidden>·</span>
                      <span>pago por</span>
                      <ParticipantBadge
                        name={t.paid_by}
                        participants={allParticipants}
                      />
                    </p>
                  </div>
                  <Currency value={t.amount ?? 0} className="text-sm font-medium" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <GuestPaybackDialog
        open={paybackOpen}
        onOpenChange={setPaybackOpen}
        token={token}
        guestName={participant.name}
        members={members}
        onSuccess={refresh}
      />
    </div>
  )
}
