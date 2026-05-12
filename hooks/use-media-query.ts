"use client"

import { useEffect, useState } from "react"

/**
 * SSR-safe media query hook. Defaults to `false` until hydrated on the client,
 * which is fine for layout choices that mirror Tailwind's `md:` (avoids
 * flicker by also gating the responsive class via CSS).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [query])

  return matches
}

/** Mirrors Tailwind's `md` breakpoint. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)")
}
