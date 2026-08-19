"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { useSessionUser } from "@/hooks/use-session-user"
import { useUserPermissions } from "@/hooks/use-user-permissions"
import { IncomeManager } from "@/components/v2/income/income-manager"

export default function IncomePage() {
  const user = useSessionUser()
  const { permissions, loading } = useUserPermissions(user)
  const router = useRouter()

  React.useEffect(() => {
    if (!loading && user !== null && !permissions.can_manage_income) {
      router.replace("/dashboard")
    }
  }, [user, permissions.can_manage_income, loading, router])

  if (loading || user === null) return null
  if (!permissions.can_manage_income) return null

  return <IncomeManager />
}
