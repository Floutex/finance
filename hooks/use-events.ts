"use client"

import { useEffect, useState } from "react"
import { getEvents } from "@/lib/supabase"

type Event = { id: string; name: string }

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getEvents().then(({ data }) => {
      if (cancelled) return
      if (data) setEvents(data.map((e) => ({ id: e.id, name: e.name })))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { events, loading }
}
