"use client"

import * as React from "react"
import { Check, Copy, Loader2, RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/v2/primitives/button"
import { Input } from "@/components/v2/primitives/input"
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
import { Skeleton } from "@/components/v2/primitives/skeleton"
import { cn } from "@/components/v2/primitives/utils"

type InviteGeneratorProps = {
  className?: string
}

/**
 * Card showing the active invite link, with copy and regenerate actions.
 * Mounted at the top of the Participants admin page (merged from a former
 * dedicated `/admin/invites` route).
 */
export function InviteGenerator({ className }: InviteGeneratorProps) {
  const [token, setToken] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [regenOpen, setRegenOpen] = React.useState(false)
  const [regenPending, setRegenPending] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [origin, setOrigin] = React.useState("")

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/invite", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha")
      setToken(json.token)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    setOrigin(window.location.origin)
    load()
  }, [load])

  const url = token ? `${origin}/g/register/${token}` : ""

  const handleCopy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const handleRegenerate = async () => {
    setRegenPending(true)
    try {
      const res = await fetch("/api/invite", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha")
      setToken(json.token)
      toast.success("Novo link gerado. O anterior foi revogado.")
      setRegenOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha")
    } finally {
      setRegenPending(false)
    }
  }

  return (
    <>
      <div
        className={cn(
          "surface-2 flex flex-col gap-4 rounded-2xl p-5",
          className
        )}
      >
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Send className="size-3.5" />
          Link de convite ativo
        </div>

        {loading ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : (
          <div className="flex items-stretch gap-2">
            <Input value={url} readOnly className="font-mono text-xs" />
            <Button onClick={handleCopy} disabled={!url} aria-label="Copiar">
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Quem abrir o link escolhe nome e cor, e recebe um magic-link pessoal.
            Existe um único link ativo por vez.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRegenOpen(true)}
            disabled={loading}
          >
            <RefreshCw className="size-3.5" />
            Regenerar
          </Button>
        </div>
      </div>

      <AlertDialog
        open={regenOpen}
        onOpenChange={(o) => {
          if (!o && !regenPending) setRegenOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar link de convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O link atual deixa de funcionar imediatamente. Qualquer cadastro
              já feito segue válido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              disabled={regenPending}
              onClick={(e) => {
                e.preventDefault()
                handleRegenerate()
              }}
            >
              {regenPending && <Loader2 className="size-4 animate-spin" />}
              Regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
