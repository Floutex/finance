"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { useSessionUser } from "@/hooks/use-session-user"
import { INCOME_USERS } from "@/lib/constants"
import { IncomeManager } from "@/components/v2/income/income-manager"

export default function IncomePage() {
  const user = useSessionUser()
  const router = useRouter()

  React.useEffect(() => {
    if (user !== null && !INCOME_USERS.includes(user)) {
      router.replace("/v2/dashboard")
    }
  }, [user, router])

  if (user === null) return null
  if (!INCOME_USERS.includes(user)) return null

  return <IncomeManager />
}
