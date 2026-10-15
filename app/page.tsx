"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { readSession } from "@/lib/session"

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    router.replace(readSession() ? "/dashboard" : "/login")
  }, [router])

  return null
}
