"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AuditLog } from "@/components/v2/admin/audit-log"
import { useSessionUser } from "@/hooks/use-session-user"
import { useUserPermissions } from "@/hooks/use-user-permissions"

export default function AdminAuditPage() {
  const user = useSessionUser()
  const { permissions, loading } = useUserPermissions(user)
  const router = useRouter()

  React.useEffect(() => {
    if (!loading && user !== null && !permissions.can_view_audit) {
      router.replace("/dashboard")
    }
  }, [user, permissions.can_view_audit, loading, router])

  if (loading || !user) return null
  if (!permissions.can_view_audit) return null

  return <AuditLog />
}
