"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getMonthlyIncomes, upsertMonthlyIncome, deleteMonthlyIncome } from "@/lib/supabase"
import type { Tables } from "@/lib/database.types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn, getUserColorClasses } from "@/components/ui/utils"
import {
  ArrowLeft,
  Check,
  DollarSign,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Save,
  Trash2,
  X
} from "lucide-react"

type MonthlyIncome = Tables<"monthly_incomes">

const PEOPLE = ["Antônio", "Júlia"]

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const formatCurrency = (value: number) => currencyFormatter.format(value)

const normalizeNumber = (value: string) => {
  if (!value.trim()) return null
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

const formatMonthLabel = (yearMonth: string) => {
  const [year, month] = yearMonth.split("-")
  const date = new Date(Number(year), Number(month) - 1)
  return format(date, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())
}

export const IncomeManager = ({
  currentUser,
  onBack,
}: {
  currentUser: string
  onBack: () => void
}) => {
  const [incomes, setIncomes] = useState<MonthlyIncome[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formPerson, setFormPerson] = useState(currentUser)
  const [formMonth, setFormMonth] = useState(() => format(new Date(), "yyyy-MM"))
  const [formAmount, setFormAmount] = useState("")
  const [formFixed, setFormFixed] = useState(false)

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editFixed, setEditFixed] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const loadIncomes = useCallback(async () => {
    const { data, error: err } = await getMonthlyIncomes()
    if (err) {
      setError("Erro ao carregar rendas")
    } else {
      setIncomes(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadIncomes()
  }, [loadIncomes])

  const handleSave = async () => {
    const amount = normalizeNumber(formAmount)
    if (amount === null || amount < 0) {
      setError("Valor inválido")
      return
    }
    setSaving(true)
    setError(null)

    const { error: err } = await upsertMonthlyIncome(formPerson, formMonth, amount, formFixed)
    if (err) {
      setError("Erro ao salvar renda")
    } else {
      setFormAmount("")
      setFormFixed(false)
      await loadIncomes()
    }
    setSaving(false)
  }

  const handleEdit = async (income: MonthlyIncome) => {
    const amount = normalizeNumber(editAmount)
    if (amount === null || amount < 0) {
      setError("Valor inválido")
      return
    }
    setEditSaving(true)
    setError(null)

    const { error: err } = await upsertMonthlyIncome(income.person, income.year_month, amount, editFixed)
    if (err) {
      setError("Erro ao atualizar renda")
    } else {
      setEditId(null)
      await loadIncomes()
    }
    setEditSaving(false)
  }

  const handleDelete = async (id: string) => {
    setError(null)
    const { error: err } = await deleteMonthlyIncome(id)
    if (err) {
      setError("Erro ao excluir renda")
    } else {
      await loadIncomes()
    }
  }

  const startEdit = (income: MonthlyIncome) => {
    setEditId(income.id)
    setEditAmount(String(income.amount))
    setEditFixed(income.is_fixed)
  }

  // Group incomes by person
  const groupedIncomes = useMemo(() => {
    const map = new Map<string, MonthlyIncome[]>()
    for (const p of PEOPLE) {
      map.set(p, incomes.filter(i => i.person === p).sort((a, b) => b.year_month.localeCompare(a.year_month)))
    }
    return map
  }, [incomes])

  // Find the active fixed income per person
  const activeFixed = useMemo(() => {
    const map = new Map<string, MonthlyIncome>()
    for (const p of PEOPLE) {
      const fixed = incomes
        .filter(i => i.person === p && i.is_fixed)
        .sort((a, b) => b.year_month.localeCompare(a.year_month))
      if (fixed.length > 0) map.set(p, fixed[0])
    }
    return map
  }, [incomes])

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ganho Mensal</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie a renda mensal para divisão proporcional de gastos
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Active fixed summary */}
      {activeFixed.size > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Renda Fixa Ativa
            </CardTitle>
            <CardDescription>Valores que se propagam automaticamente para meses futuros</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {PEOPLE.map(person => {
                const fixed = activeFixed.get(person)
                return (
                  <div
                    key={person}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3",
                      getUserColorClasses(person)
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                      {person.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{person}</p>
                      {fixed ? (
                        <p className="text-xs opacity-80">
                          {formatCurrency(fixed.amount)} desde {formatMonthLabel(fixed.year_month)}
                        </p>
                      ) : (
                        <p className="text-xs opacity-60">Sem renda fixa definida</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add new income */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Registrar Renda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Pessoa</Label>
              <div className="flex gap-2">
                {PEOPLE.map(person => (
                  <button
                    key={person}
                    onClick={() => setFormPerson(person)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                      formPerson === person
                        ? cn(getUserColorClasses(person), "ring-1 ring-white/20")
                        : "border-border bg-black/20 text-muted-foreground hover:bg-black/30"
                    )}
                  >
                    {person}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Mês</Label>
              <Input
                type="month"
                value={formMonth}
                onChange={e => setFormMonth(e.target.value)}
                className="w-44"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="5.000,00"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSave() }}
                className="w-40"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFormFixed(!formFixed)}
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded border transition-all",
                  formFixed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-transparent"
                )}
              >
                {formFixed && <Check className="h-3 w-3" />}
              </button>
              <Label className="text-xs text-muted-foreground cursor-pointer" onClick={() => setFormFixed(!formFixed)}>
                Fixar a partir deste mês
              </Label>
            </div>

            <Button onClick={handleSave} disabled={saving || !formAmount.trim()} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-1.5">Salvar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Income history per person */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {PEOPLE.map(person => {
            const personIncomes = groupedIncomes.get(person) ?? []
            return (
              <Card key={person}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                        getUserColorClasses(person)
                      )}
                    >
                      {person.charAt(0)}
                    </div>
                    {person}
                  </CardTitle>
                  <CardDescription>
                    {personIncomes.length === 0
                      ? "Nenhuma renda registrada"
                      : `${personIncomes.length} registro${personIncomes.length > 1 ? "s" : ""}`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {personIncomes.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Sem registros de renda
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {personIncomes.map(income => (
                        <div
                          key={income.id}
                          className="flex items-center justify-between rounded-lg border border-border/50 bg-black/20 px-3 py-2"
                        >
                          {editId === income.id ? (
                            // Edit mode
                            <div className="flex flex-1 items-center gap-2">
                              <span className="text-sm text-muted-foreground min-w-[100px]">
                                {formatMonthLabel(income.year_month)}
                              </span>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={editAmount}
                                onChange={e => setEditAmount(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleEdit(income)
                                  if (e.key === "Escape") setEditId(null)
                                }}
                                className="h-8 w-28 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => setEditFixed(!editFixed)}
                                className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded border transition-all shrink-0",
                                  editFixed
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-input bg-transparent"
                                )}
                                title="Fixar"
                              >
                                {editFixed && <Check className="h-2.5 w-2.5" />}
                              </button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEdit(income)}
                                disabled={editSaving}
                              >
                                {editSaving ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 text-green-400" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditId(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            // View mode
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {formatMonthLabel(income.year_month)}
                                </span>
                                {income.is_fixed && (
                                  <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                                    <Lock className="h-2.5 w-2.5" />
                                    Fixo
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {formatCurrency(income.amount)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => startEdit(income)}
                                >
                                  <Pencil className="h-3 w-3 text-muted-foreground" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleDelete(income.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
