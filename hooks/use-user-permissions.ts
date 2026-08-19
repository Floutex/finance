"use client"

import { useMemo } from "react"
import { useSessionUser } from "@/hooks/use-session-user"
import { useParticipants } from "@/hooks/use-participants"
import {
  getEffectivePermissions,
  type EffectivePermissions,
  DEFAULT_PERMISSIONS,
} from "@/lib/permissions"

export function useUserPermissions(customUser?: string | null): {
  permissions: EffectivePermissions
  loading: boolean
} {
  const sessionUser = useSessionUser()
  const user = customUser !== undefined ? customUser : sessionUser
  const { all: participants, loading } = useParticipants()

  const permissions = useMemo(() => {
    if (!user) {
      return {
        isAdmin: false,
        ...DEFAULT_PERMISSIONS,
      }
    }
    const participant = participants.find((p) => p.name.toLowerCase() === user.toLowerCase())
    if (participant) {
      return getEffectivePermissions(participant)
    }
    // Fallback if not found in cache yet
    return getEffectivePermissions({ name: user, is_admin: user === "Antônio" })
  }, [user, participants])

  return {
    permissions,
    loading,
  }
}
