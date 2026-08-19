"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CategoriesManager } from "@/components/v2/admin/categories-manager"
import { useSessionUser } from "@/hooks/use-session-user"
import { useUserPermissions } from "@/hooks/use-user-permissions"

export default function AdminCategoriesPage() {
  const user = useSessionUser()
  const { permissions, loading } = useUserPermissions(user)
  const router = useRouter()

  React.useEffect(() => {
    if (!loading && user !== null && !permissions.can_manage_categories) {
      router.replace("/dashboard")
    }
  }, [user, permissions.can_manage_categories, loading, router])

  if (loading || !user) return null
  if (!permissions.can_manage_categories) return null

  return <CategoriesManager actor={user} />
}
