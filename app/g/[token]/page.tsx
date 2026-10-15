"use client"

import * as React from "react"
import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/v2/primitives/button"
import { validateSession, writeSession } from "@/lib/session"

export default function LinkEntryPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)

  const enter = React.useCallback(async () => {
    setError(null)
    const name = await validateSession({ name: "", token })
    if (name === null) {
      setError("Esse link foi desativado. Peça um link novo para quem administra o grupo.")
      return
    }
    if (name === undefined) {
      setError("Não foi possível conferir o link. Verifique a conexão e tente de novo.")
      return
    }
    writeSession({ name, token })
    router.replace("/dashboard")
  }, [token, router])

  React.useEffect(() => {
    enter()
  }, [enter])

  if (!error) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-sm space-y-4 text-center">
        <p className="font-display text-2xl font-semibold">Não foi possível entrar</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={enter}>
            Tentar de novo
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">Entrar com PIN</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
