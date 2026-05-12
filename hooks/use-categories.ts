"use client"

import { useEffect, useState } from "react"
import { getCategories } from "@/lib/supabase"

type Category = { id: string; name: string }

/**
 * Loads the list of category names once on mount. Mirrors what
 * `CategorySelector` does in the legacy UI.
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCategories().then(({ data }) => {
      if (cancelled) return
      if (data) {
        setCategories(
          data.map((c) => ({ id: c.id, name: c.name }))
        )
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { categories, loading }
}
