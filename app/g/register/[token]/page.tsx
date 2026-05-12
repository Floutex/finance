"use client"

import * as React from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Check, Copy, Loader2 } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import { Button } from "@/components/v2/primitives/button"
import { Input } from "@/components/v2/primitives/input"
import { Label } from "@/components/v2/primitives/label"

const COLOR_PALETTE = [
  "#F87171", "#FB923C", "#FBBF24", "#A3E635", "#34D399",
  "#22D3EE", "#60A5FA", "#A78BFA", "#F472B6", "#E879F9",
  "#94A3B8", "#FDE047",
]

export default function GuestRegisterPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const router = useRouter()

  const [name, setName] = React.useState("")
  const [color, setColor] = React.useState(COLOR_PALETTE[6])
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [personalToken, setPersonalToken] = React.useState<string | null>(null)
  const [participantName, setParticipantName] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const personalUrl =
    personalToken && typeof window !== "undefined"
      ? `${window.location.origin}/v2/g/${personalToken}`
      : ""

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/invite/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), color }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha")
      setPersonalToken(json.personalToken)
      setParticipantName(json.participant?.name ?? name.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha")
    } finally {
      setSubmitting(false)
    }
  }

  const copy = async () => {
    if (!personalUrl) return
    try {
      await navigator.clipboard.writeText(personalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  if (personalToken) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="surface-2 flex w-full max-w-lg flex-col gap-6 rounded-2xl p-8">
          <div className="space-y-3 text-center">
            <div
              className="mx-auto flex size-16 items-center justify-center rounded-full text-2xl font-bold"
              style={{ backgroundColor: color, color: "#0a0a0a" }}
            >
              {participantName?.charAt(0)?.toUpperCase()}
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Bem-vindo, {participantName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Salve este link — ele é seu acesso. Se perder, peça um novo convite
              para o admin.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Seu magic-link</Label>
            <div className="flex items-stretch gap-2">
              <Input value={personalUrl} readOnly className="font-mono text-xs" />
              <Button onClick={copy} aria-label="Copiar">
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => router.push(`/g/${personalToken}`)}
          >
            Entrar agora
            <ArrowRight />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <form
        onSubmit={submit}
        className="surface-2 flex w-full max-w-md flex-col gap-5 rounded-2xl p-8"
      >
        <div className="space-y-1 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Convite
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Você foi convidado
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha um nome e uma cor para te identificar.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="g-name">Nome</Label>
          <Input
            id="g-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Como o pessoal te chama"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Cor</Label>
          <div className="flex flex-wrap items-center gap-2">
            <div
              aria-hidden
              className="grid size-9 place-items-center rounded-full text-sm font-bold transition-colors"
              style={{ backgroundColor: color, color: "#0a0a0a" }}
            >
              {name.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-8 rounded-full border-2 transition-all",
                    color.toLowerCase() === c.toLowerCase()
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-110"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || !name.trim()}
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Cadastrar
        </Button>
      </form>
    </div>
  )
}
