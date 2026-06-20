"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

import { cn } from "@/components/v2/primitives/utils"
import { Button } from "@/components/v2/primitives/button"
import { Label } from "@/components/v2/primitives/label"
import { Badge } from "@/components/v2/primitives/badge"
import { Skeleton } from "@/components/v2/primitives/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/v2/primitives/select"
import { DateRangePicker } from "@/components/v2/primitives/date-picker"
import { ParticipantBadge } from "@/components/v2/finance/participant-badge"
import { Currency } from "@/components/v2/finance/currency"
import { useParticipants } from "@/hooks/use-participants"
import { formatCurrency } from "@/lib/constants"

type AuditRow = {
  id: number
  transaction_id: string
  actor: string | null
  action: "insert" | "update" | "delete" | string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  created_at: string
}

const TRACKED_FIELDS: Array<{
  key: string
  label: string
  format?: (v: unknown) => string
}> = [
  { key: "description", label: "Descrição" },
  { key: "category", label: "Categoria" },
  { key: "paid_by", label: "Pago por" },
  { key: "date", label: "Data" },
  {
    key: "amount",
    label: "Valor",
    format: (v) => (typeof v === "number" ? formatCurrency(v) : String(v ?? "—")),
  },
  {
    key: "participants",
    label: "Participantes",
    format: (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? "—")),
  },
  {
    key: "is_hidden",
    label: "Excluído",
    format: (v) => (v ? "Sim" : "Não"),
  },
  {
    key: "receipt_url",
    label: "Recibo",
    format: (v) => (v ? "Anexado" : "—"),
  },
]

function fmt(field: string, value: unknown): string {
  const def = TRACKED_FIELDS.find((f) => f.key === field)
  if (def?.format) return def.format(value)
  if (value === null || value === undefined || value === "") return "—"
  return String(value)
}

export function AuditLog() {
  const { active } = useParticipants()
  const [rows, setRows] = React.useState<AuditRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [expanded, setExpanded] = React.useState<number | null>(null)

  const [actor, setActor] = React.useState("")
  const [action, setAction] = React.useState("")
  const [start, setStart] = React.useState("")
  const [end, setEnd] = React.useState("")

  const fetchPage = React.useCallback(
    async (cursor: string | null) => {
      setLoading(true)
      const params = new URLSearchParams()
      if (actor) params.set("actor", actor)
      if (action) params.set("action", action)
      if (start) params.set("start", start)
      if (end) params.set("end", end + "T23:59:59")
      if (cursor) params.set("cursor", cursor)
      try {
        const res = await fetch(`/api/admin/audit?${params.toString()}`, {
          cache: "no-store",
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Falha ao carregar")
        if (cursor) setRows((prev) => [...prev, ...json.items])
        else setRows(json.items)
        setNextCursor(json.nextCursor)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao carregar")
      } finally {
        setLoading(false)
      }
    },
    [actor, action, start, end]
  )

  React.useEffect(() => {
    setRows([])
    setNextCursor(null)
    fetchPage(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, action, start, end])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-8 md:py-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Histórico de atividades
        </h1>
        <p className="text-sm text-muted-foreground">
          Tudo que aconteceu nas transações da plataforma. Filtros refinam por
          ator, tipo de ação e período.
        </p>
      </header>

      <div className="surface-1 grid gap-3 rounded-xl p-4 md:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="audit-actor" className="text-xs text-muted-foreground">
            Ator
          </Label>
          <Select value={actor || "all"} onValueChange={(v) => setActor(v === "all" ? "" : v)}>
            <SelectTrigger id="audit-actor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {active.map((p) => (
                <SelectItem key={p.id} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-action" className="text-xs text-muted-foreground">
            Ação
          </Label>
          <Select value={action || "all"} onValueChange={(v) => setAction(v === "all" ? "" : v)}>
            <SelectTrigger id="audit-action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="insert">Criação</SelectItem>
              <SelectItem value="update">Edição</SelectItem>
              <SelectItem value="delete">Exclusão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="audit-range" className="text-xs text-muted-foreground">
            Período
          </Label>
          <DateRangePicker
            id="audit-range"
            start={start}
            end={end}
            onChange={(next) => {
              setStart(next.start)
              setEnd(next.end)
            }}
            align="end"
            className="w-full"
          />
        </div>
      </div>

      <div className="surface-1 overflow-hidden rounded-xl">
        {loading && rows.length === 0 ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="px-4 py-3">
                <Skeleton className="h-5 w-3/4" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum log para os filtros aplicados.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const isOpen = expanded === row.id
              const desc =
                ((row.after?.description ?? row.before?.description) as string) ||
                "—"
              const amount = (row.after?.amount ?? row.before?.amount) as
                | number
                | null
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-accent/40"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    )}
                    <span className="min-w-[140px] tabular-nums text-xs text-muted-foreground">
                      {format(parseISO(row.created_at), "dd MMM HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                    {row.actor ? (
                      <ParticipantBadge name={row.actor} participants={active} />
                    ) : (
                      <span className="text-xs italic text-muted-foreground">
                        desconhecido
                      </span>
                    )}
                    <Badge
                      variant={
                        row.action === "insert"
                          ? "success"
                          : row.action === "delete"
                          ? "destructive"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {row.action === "insert"
                        ? "criou"
                        : row.action === "delete"
                        ? "excluiu"
                        : "editou"}
                    </Badge>
                    <span className="flex-1 truncate text-sm">{desc}</span>
                    {typeof amount === "number" && (
                      <Currency
                        value={amount}
                        className="text-sm text-muted-foreground"
                      />
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-border bg-background/40 px-4 py-3 text-xs">
                      {row.action === "insert" ? (
                        <div className="space-y-1">
                          <p className="mb-2 font-medium text-muted-foreground">
                            Valores criados:
                          </p>
                          {TRACKED_FIELDS.map((f) => (
                            <div key={f.key} className="flex gap-2">
                              <span className="min-w-[120px] text-muted-foreground">
                                {f.label}
                              </span>
                              <span className="font-medium">
                                {fmt(f.key, row.after?.[f.key])}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {TRACKED_FIELDS.map((f) => {
                            const oldS = fmt(f.key, row.before?.[f.key])
                            const newS = fmt(f.key, row.after?.[f.key])
                            if (oldS === newS) return null
                            return (
                              <div
                                key={f.key}
                                className="grid gap-1 md:grid-cols-[140px_1fr_auto_1fr]"
                              >
                                <span className="text-muted-foreground">{f.label}</span>
                                <span className="break-all text-destructive line-through">
                                  {oldS}
                                </span>
                                <span className="hidden text-muted-foreground md:inline">
                                  →
                                </span>
                                <span className="break-all text-success">{newS}</span>
                              </div>
                            )
                          })}
                          {TRACKED_FIELDS.every(
                            (f) =>
                              fmt(f.key, row.before?.[f.key]) ===
                              fmt(f.key, row.after?.[f.key])
                          ) && (
                            <p className="italic text-muted-foreground">
                              Nenhuma diferença em campos rastreados.
                            </p>
                          )}
                        </div>
                      )}
                      <p className="mt-3 border-t border-border pt-2 text-muted-foreground">
                        ID da transação:{" "}
                        <code className="text-foreground">{row.transaction_id}</code>
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {rows.length} {rows.length === 1 ? "registro" : "registros"}
        </span>
        {nextCursor && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchPage(nextCursor)}
            disabled={loading}
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            Carregar mais
          </Button>
        )}
      </div>
    </div>
  )
}
