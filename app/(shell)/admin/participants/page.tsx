"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ParticipantsManager } from "@/components/v2/admin/participants-manager"
import { useSessionUser } from "@/hooks/use-session-user"
import { useUserPermissions } from "@/hooks/use-user-permissions"

export default function AdminParticipantsPage() {
  const user = useSessionUser()
  const { permissions, loading } = useUserPermissions(user)
  const router = useRouter()

  React.useEffect(() => {
    if (!loading && user !== null && !permissions.can_manage_invites && !permissions.isAdmin) {
      router.replace("/dashboard")
    }
  }, [user, permissions.can_manage_invites, permissions.isAdmin, loading, router])

  if (loading || !user) return null
  if (!permissions.can_manage_invites && !permissions.isAdmin) return null

  return <ParticipantsManager />
}
