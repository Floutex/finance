"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Sidebar } from "@/components/v2/layout/sidebar"
import { SESSION_USER_KEY, USERS } from "@/lib/constants"

/**
 * Authenticated app shell — sidebar + content area. Reads the session user from
 * `sessionStorage` (shared with the legacy /); bounces to /v2/login if absent
 * or unknown. Used by the `(shell)` route group's layout.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = React.useState<string | null>(null)
  const [checked, setChecked] = React.useState(false)

  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_USER_KEY)
      if (stored && USERS.some((u) => u.name === stored)) {
        setUser(stored)
      } else {
        router.replace("/v2/login")
      }
    } catch {
      router.replace("/v2/login")
    } finally {
      setChecked(true)
    }
  }, [router])

  if (!checked || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Carregando…
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
