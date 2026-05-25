"use client"

import * as React from "react"
import { use } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/v2/primitives/button"
import {
  GuestProvider,
  type GuestState,
} from "@/components/v2/guest/guest-context"
import { GuestShell } from "@/components/v2/guest/guest-shell"

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
