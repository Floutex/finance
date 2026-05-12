"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Check, Loader2, Lock, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/components/v2/primitives/utils"
import { Button } from "@/components/v2/primitives/button"
import { Input } from "@/components/v2/primitives/input"
import { Label } from "@/components/v2/primitives/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/v2/primitives/card"
import { Skeleton } from "@/components/v2/primitives/skeleton"
import { Currency } from "@/components/v2/finance/currency"
import { ParticipantAvatar } from "@/components/v2/finance/participant-avatar"
import { Checkbox } from "@/components/v2/primitives/checkbox"
import { useMonthlyIncomes } from "@/hooks/use-monthly-incomes"
import { normalizeNumber, INCOME_USERS } from "@/lib/constants"
import type { Tables } from "@/lib/database.types"

type MonthlyIncome = Tables<"monthly_incomes">

const PEOPLE = INCOME_USERS

function formatMonthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-")
  const d = new Date(Number(year), Number(month) - 1)
  return format(d, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())
}

const currentYearMonth = () => format(new Date(), "yyyy-MM")

/**
 * v2 income manager: two-column layout (one card per income-user), each card
 * has a sticky "Active fixed" banner, an inline add form, and the historical
 * list with inline edit/delete.
 */
export function IncomeManager() {
  const { incomes, loading, upsert, remove } = useMonthlyIncomes()

  const grouped = React.useMemo(() => {
    const map = new Map<string, MonthlyIncome[]>()
    for (const p of PEOPLE) {
      map.set(
        p,
        incomes
          .filter((i) => i.person === p)
          .sort((a, b) => b.year_month.localeCompare(a.year_month))
      )
    }
    return map
  }, [incomes])

  const activeFixed = React.useMemo(() => {
    const map = new Map<string, MonthlyIncome>()
    for (const p of PEOPLE) {
      const fixed = incomes
        .filter((i) => i.person === p && i.is_fixed)
        .sort((a, b) => b.year_month.localeCompare(a.year_month))
      if (fixed.length > 0) map.set(p, fixed[0])
    }
    return map
  }, [incomes])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-8 md:py-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Ganho mensal
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Renda mensal
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Define o valor recebido em cada mês para que a divisão proporcional de
          gastos no dashboard use as proporções corretas. Renda marcada como
          fixa propaga para meses futuros sem entrada explícita.
        </p>
      </header>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {PEOPLE.map((person) => (
            <PersonIncomeCard
              key={person}
              person={person}
              entries={grouped.get(person) ?? []}
              activeFixed={activeFixed.get(person)}
              onUpsert={upsert}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type PersonIncomeCardProps = {
  person: string
  entries: MonthlyIncome[]
  activeFixed: MonthlyIncome | undefined
  onUpsert: (
    person: string,
    yearMonth: string,
    amount: number,
    isFixed: boolean
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function PersonIncomeCard({
  person,
  entries,
  activeFixed,
  onUpsert,
  onDelete,
}: PersonIncomeCardProps) {
  const [month, setMonth] = React.useState(currentYearMonth)
  const [amount, setAmount] = React.useState("")
  const [fixed, setFixed] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const submitAdd = async () => {
    const v = normalizeNumber(amount)
    if (v === null || v < 0) {
      toast.error("Valor inválido.")
      return
    }
    setSaving(true)
    try {
      await onUpsert(person, month, v, fixed)
      setAmount("")
      setFixed(false)
      toast.success(`${person}: ${formatMonthLabel(month)} salvo.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <ParticipantAvatar name={person} size="md" />
        <div className="flex-1 space-y-0.5">
          <CardTitle className="text-base">{person}</CardTitle>
          <CardDescription>
            {entries.length === 0
              ? "Nenhuma renda registrada"
              : `${entries.length} ${entries.length === 1 ? "registro" : "registros"}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeFixed && (
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <Lock className="size-3.5 text-primary" />
            <span className="text-muted-foreground">Renda fixa ativa:</span>
            <Currency value={activeFixed.amount} className="font-medium" />
            <span className="text-muted-foreground">
              desde {formatMonthLabel(activeFixed.year_month)}
            </span>
          </div>
        )}

        {/* Add form */}
        <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`m-${person}`} className="text-[11px] text-muted-foreground">
                Mês
              </Label>
              <Input
                id={`m-${person}`}
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`a-${person}`} className="text-[11px] text-muted-foreground">
                Valor
              </Label>
              <Input
                id={`a-${person}`}
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAdd()
                }}
                className="h-8"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={fixed}
                onCheckedChange={(v) => setFixed(!!v)}
              />
              Fixar a partir deste mês
            </label>
            <Button
              size="sm"
              onClick={submitAdd}
              disabled={saving || !amount.trim()}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Salvar
            </Button>
          </div>
        </div>

        {/* History */}
        {entries.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Sem registros ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {entries.map((entry) => (
              <IncomeEntryRow
                key={entry.id}
                entry={entry}
                onUpsert={onUpsert}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function IncomeEntryRow({
  entry,
  onUpsert,
  onDelete,
}: {
  entry: MonthlyIncome
  onUpsert: (
    person: string,
    yearMonth: string,
    amount: number,
    isFixed: boolean
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = React.useState(false)
  const [amount, setAmount] = React.useState(String(entry.amount))
  const [fixed, setFixed] = React.useState(!!entry.is_fixed)
  const [pending, setPending] = React.useState(false)

  const cancel = () => {
    setEditing(false)
    setAmount(String(entry.amount))
    setFixed(!!entry.is_fixed)
  }

  const save = async () => {
    const v = normalizeNumber(amount)
    if (v === null || v < 0) {
      toast.error("Valor inválido.")
      return
    }
    setPending(true)
    try {
      await onUpsert(entry.person, entry.year_month, v, fixed)
      setEditing(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar.")
    } finally {
      setPending(false)
    }
  }

  const handleDelete = async () => {
    setPending(true)
    try {
      await onDelete(entry.id)
      toast.success("Removido.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover.")
    } finally {
      setPending(false)
    }
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
        <span className="min-w-[90px] text-xs text-muted-foreground">
          {formatMonthLabel(entry.year_month)}
        </span>
        <Input
          inputMode="decimal"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") cancel()
          }}
          className="h-7 max-w-[110px] text-xs"
        />
        <Checkbox checked={fixed} onCheckedChange={(v) => setFixed(!!v)} />
        <span className="text-[10px] text-muted-foreground">Fixo</span>
        <Button size="icon" variant="ghost" className="size-7" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-success" />}
        </Button>
        <Button size="icon" variant="ghost" className="size-7" onClick={cancel} disabled={pending}>
          <X className="size-3.5" />
        </Button>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-transparent px-2.5 py-1.5 hover:border-border hover:bg-accent/40">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {formatMonthLabel(entry.year_month)}
        </span>
        {entry.is_fixed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <Lock className="size-2.5" />
            Fixo
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Currency value={entry.amount} className="text-sm font-medium" />
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => setEditing(true)}
          aria-label="Editar"
        >
          <Pencil className="size-3.5 text-muted-foreground" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={pending}
          aria-label="Remover"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  )
}
