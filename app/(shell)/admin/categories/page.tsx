"use client"

import { CategoriesManager } from "@/components/v2/admin/categories-manager"
import { useSessionUser } from "@/hooks/use-session-user"

export default function AdminCategoriesPage() {
  const user = useSessionUser()
  if (!user) return null
  return <CategoriesManager actor={user} />
}
