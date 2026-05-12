"use client"

import { useEffect, useState } from "react"
import { SESSION_USER_KEY, USERS } from "@/lib/constants"

/**
 * Subscribe to the currently logged-in member name from sessionStorage. Returns
 * `null` while hydrating or when no valid user is present — consumers should
 * already be inside the v2 shell, which guards against that case.
 */
export function useSessionUser(): string | null {
  const [user, setUser] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_USER_KEY)
      if (stored && USERS.some((u) => u.name === stored)) setUser(stored)
    } catch {}
  }, [])

  return user
}
