"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Loader2, HandCoins, Plus, X } from "lucide-react"
import { formatCurrency, getParticipantStyle, getParticipantAvatarStyle } from "@/lib/constants"

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

export default function GuestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [state, setState] = useState<State | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paybackOpen, setPaybackOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/guest/${token}/state`, { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar")
      setState(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { refresh() }, [refresh])

  const balanceText = useMemo(() => {
    if (!state) return null
    let total = 0
    for (const d of state.debts) {
      if (d.from === state.participant.name) total -= d.amount
      else if (d.to === state.participant.name) total += d.amount
    }
    return total
  }, [state])

  if (loading && !state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin opacity-60" />
      </div>
    )
  }

  if (error || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md text-center space-y-2">
          <p className="text-lg font-medium">Não foi possível carregar</p>
          <p className="text-sm text-muted-foreground">{error ?? "Link inválido"}</p>
          <Button variant="outline" onClick={refresh}>Tentar de novo</Button>
        </div>
      </div>
    )
  }

  const { participant, members, transactions, debts } = state

  return (
    <div className="min-h-screen bg-background pb-20">
      <header
        className="px-4 py-8 md:py-10"
        style={{
          background: `radial-gradient(circle at top, ${participant.color}30 0%, transparent 60%)`,
        }}
      >
        <div className="mx-auto max-w-3xl flex items-center gap-4">
          <div
            className="h-14 w-14 md:h-16 md:w-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={getParticipantAvatarStyle(participant.name, [participant])}
          >
            {participant.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Olá,</p>
            <h1 className="text-2xl md:text-3xl font-bold">{participant.name}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Seu saldo</p>
          <p className={`mt-1 text-3xl font-semibold tabular-nums ${(balanceText ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(balanceText ?? 0)}
          </p>
          {debts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Tudo certo — sem dívidas pendentes.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {debts.map((d, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span>
                    {d.from === participant.name ? (
                      <>Você deve <strong>{d.to}</strong></>
                    ) : (
                      <><strong>{d.from}</strong> te deve</>
                    )}
                  </span>
                  <span className="tabular-nums font-medium">{formatCurrency(d.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex gap-2">
            <Button onClick={() => setPaybackOpen(true)}>
              <HandCoins className="mr-2 h-4 w-4" /> Registrar pagamento
            </Button>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <p className="text-sm font-medium">Transações onde você aparece</p>
            <p className="text-xs text-muted-foreground">{transactions.length} {transactions.length === 1 ? "registro" : "registros"}</p>
          </div>
          {transactions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">Nenhuma transação ainda.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {transactions.map(t => {
                const everyone = [{ name: participant.name, color: participant.color }, ...members.map(m => ({ name: m.name, color: m.color }))]
                return (
                  <li key={t.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(t.date), "dd/MM/yyyy", { locale: ptBR })} · pago por <span style={getParticipantStyle(t.paid_by, everyone)} className="px-1.5 py-0.5 rounded text-xs font-medium border">{t.paid_by}</span>
                      </p>
                    </div>
                    <span className="text-sm tabular-nums font-medium">{formatCurrency(t.amount ?? 0)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      {paybackOpen && (
        <PaybackDialog
          token={token}
          guestName={participant.name}
          members={members}
          onClose={() => setPaybackOpen(false)}
          onSubmitted={() => { setPaybackOpen(false); refresh() }}
        />
      )}
    </div>
  )
}

function PaybackDialog({
  token, guestName, members, onClose, onSubmitted,
}: {
  token: string
  guestName: string
  members: Participant[]
  onClose: () => void
  onSubmitted: () => void
}) {
  const [member, setMember] = useState(members[0]?.name ?? "")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError(null)
    const numAmount = Number(amount.replace(",", "."))
    try {
      const res = await fetch(`/api/guest/${token}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member, amount: numAmount, date, description }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro")
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full items-end md:items-center justify-center p-0 md:p-4">
        <form
          onSubmit={handleSubmit}
          className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-border bg-card p-6 shadow-lg space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">Registrar pagamento</p>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Você ({guestName}) está pagando um valor pra um member. Vai aparecer no extrato e abater seu saldo.
          </p>

          <div className="space-y-2">
            <Label htmlFor="payback-member">Pra quem</Label>
            <Select id="payback-member" value={member} onChange={e => setMember(e.target.value)}>
              {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </Select>
          </div>

          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payback-amount">Valor</Label>
              <Input id="payback-amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payback-date">Data</Label>
              <Input id="payback-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payback-description">Descrição (opcional)</Label>
            <Input
              id="payback-description"
              placeholder="Acerto de contas"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting || !member || !amount.trim()}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando</> : <><Plus className="mr-2 h-4 w-4" />Registrar</>}
          </Button>
        </form>
      </div>
    </div>
  )
}
