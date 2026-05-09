"use client"

import { useEffect, useState } from "react"
import { CategoriesPanel } from "@/components/admin/categories-panel"
import { SESSION_USER_KEY, ADMIN_USER } from "@/lib/constants"

export default function CategoriesPage() {
  const [actor, setActor] = useState<string>(ADMIN_USER)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_USER_KEY)
      if (stored) setActor(stored)
    } catch { }
  }, [])

  return <CategoriesPanel actor={actor} />
}
