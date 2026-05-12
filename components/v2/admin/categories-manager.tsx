"use client"

import * as React from "react"
import { Check, GitMerge, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/v2/primitives/button"
import { Input } from "@/components/v2/primitives/input"
import { Label } from "@/components/v2/primitives/label"
import { Badge } from "@/components/v2/primitives/badge"
import { Skeleton } from "@/components/v2/primitives/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/v2/primitives/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/v2/primitives/alert-dialog"
import { buttonVariants } from "@/components/v2/primitives/button"
import { cn } from "@/components/v2/primitives/utils"
import { reloadTransactions } from "@/lib/transactions-cache"

type Category = { id: string | null; name: string; inTable: boolean; usage: number }

type Action = { kind: "rename" | "merge"; from: string; to: string }

type Props = { actor: string }

export function CategoriesManager({ actor }: Props) {
  const [items, setItems] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState("")
  const [action, setAction] = React.useState<Action | null>(null)
  const [actionPending, setActionPending] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Category | null>(null)
  const [deletePending, setDeletePending] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [addName, setAddName] = React.useState("")
  const [addPending, setAddPending] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/categories", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar")
      setItems(json.categories)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const filtered = items.filter((c) =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  )

  const callApi = async (
    kind: "rename" | "merge" | "delete" | "create",
    from: string,
    to?: string
  ) => {
    if (kind === "create") {
      // Direct supabase upsert via the existing endpoint is not exposed for
      // create — but the API treats "rename to an unused name" identically to
      // upserting. So we synthesize by inserting into `categories` via
      // a small client write through the supabase client.
      throw new Error("create unsupported")
    }
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: kind, from, to, actor }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? "Falha")
    return json
  }

  const handleConfirmAction = async () => {
    if (!action) return
    const to = action.to.trim()
    if (!to || to === action.from) return
    setActionPending(true)
    try {
      await callApi(action.kind, action.from, to)
      toast.success(
        action.kind === "rename" ? "Categoria renomeada." : "Categorias mescladas."
      )
      await reloadTransactions()
      await load()
      setAction(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha.")
    } finally {
      setActionPending(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletePending(true)
    try {
      await callApi("delete", deleteTarget.name)
      toast.success("Categoria excluída.")
      await load()
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir.")
    } finally {
      setDeletePending(false)
    }
  }

  const handleAdd = async () => {
    const name = addName.trim()
    if (!name) return
    if (items.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Categoria já existe.")
      return
    }
    setAddPending(true)
    try {
      const { upsertCategory } = await import("@/lib/supabase")
      const { error } = await upsertCategory(name)
      if (error) throw new Error(error.message)
      toast.success("Categoria criada.")
      await load()
      setAddOpen(false)
      setAddName("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar.")
    } finally {
      setAddPending(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Admin
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Categorias
          </h1>
          <p className="text-sm text-muted-foreground">
            Crie, renomeie, mescle ou remova categorias. Categorias com uso em transações precisam ser renomeadas ou mescladas antes da remoção.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          Nova categoria
        </Button>
      </header>

      <div className="surface-1 overflow-hidden rounded-xl">
        <div className="border-b border-border p-3">
          <div className="relative max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filtrar categorias…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
        </div>

        {loading ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-4 py-3">
                <Skeleton className="h-5 w-2/3" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {filter
              ? "Nenhuma categoria corresponde ao filtro."
              : "Nenhuma categoria criada ainda."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((cat) => (
              <li key={cat.name} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cat.usage} {cat.usage === 1 ? "transação" : "transações"}
                    {!cat.inTable && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-[10px] uppercase tracking-wider"
                      >
                        Órfã
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label="Renomear"
                    onClick={() =>
                      setAction({ kind: "rename", from: cat.name, to: cat.name })
                    }
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label="Mesclar"
                    onClick={() => setAction({ kind: "merge", from: cat.name, to: "" })}
                  >
                    <GitMerge className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "size-8 text-muted-foreground hover:text-destructive",
                      cat.usage > 0 && "opacity-40"
                    )}
                    aria-label="Excluir"
                    disabled={cat.usage > 0}
                    onClick={() => setDeleteTarget(cat)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Rename / merge dialog */}
      <Dialog
        open={action !== null}
        onOpenChange={(o) => {
          if (!o && !actionPending) setAction(null)
        }}
      >
        <DialogContent>
          {action && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {action.kind === "rename" ? "Renomear categoria" : "Mesclar categoria"}
                </DialogTitle>
                <DialogDescription>
                  {action.kind === "rename" ? (
                    <>
                      Renomear <strong>{action.from}</strong> — todas as transações
                      passam a usar o novo nome.
                    </>
                  ) : (
                    <>
                      Mesclar <strong>{action.from}</strong> em outra categoria existente
                      ou nova.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="cat-to">
                  {action.kind === "rename" ? "Novo nome" : "Categoria destino"}
                </Label>
                <Input
                  id="cat-to"
                  autoFocus
                  list="all-cats-list"
                  value={action.to}
                  onChange={(e) =>
                    setAction((prev) => prev && { ...prev, to: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmAction()
                  }}
                />
                <datalist id="all-cats-list">
                  {items
                    .filter((c) => c.name !== action.from)
                    .map((c) => (
                      <option key={c.name} value={c.name} />
                    ))}
                </datalist>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setAction(null)}
                  disabled={actionPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  disabled={
                    actionPending ||
                    !action.to.trim() ||
                    action.to.trim() === action.from
                  }
                >
                  {actionPending ? <Loader2 className="size-4 animate-spin" /> : <Check />}
                  {action.kind === "rename" ? "Renomear" : "Mesclar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o && !deletePending) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Excluir <strong>{deleteTarget.name}</strong>. Categorias com transações
                  associadas precisam ser renomeadas ou mescladas antes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              disabled={deletePending}
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
            >
              {deletePending && <Loader2 className="size-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add new */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          if (!o && !addPending) {
            setAddOpen(false)
            setAddName("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
            <DialogDescription>
              Categorias ficam disponíveis no autocomplete do formulário de transações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Nome</Label>
            <Input
              id="cat-name"
              autoFocus
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
              }}
              placeholder="Ex.: Mercado"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={addPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={addPending || !addName.trim()}>
              {addPending ? <Loader2 className="size-4 animate-spin" /> : <Plus />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
