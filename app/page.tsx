"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SESSION_USER_KEY, USERS } from "@/lib/constants"

/**
 * Session-aware redirect entry. Sends authenticated members to /v2/dashboard,
 * everyone else to /v2/login. Renders nothing visible — replaces the smoke
 * page that used to live here (now at /v2/preview).
 */
export default function V2Index() {
  const router = useRouter()

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_USER_KEY)
      if (stored && USERS.some((u) => u.name === stored)) {
        router.replace("/dashboard")
      } else {
        router.replace("/login")
      }
    } catch {
      router.replace("/login")
    }
  }, [router])

  return null
}
