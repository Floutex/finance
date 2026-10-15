"use client"

import { useEffect, useState } from "react"
import { readSession } from "@/lib/session"

export function useSessionUser(): string | null {
  const [user, setUser] = useState<string | null>(null)

  useEffect(() => {
    setUser(readSession()?.name ?? null)
  }, [])

  return user
}
