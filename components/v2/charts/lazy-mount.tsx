"use client"

import * as React from "react"

import { Skeleton } from "@/components/v2/primitives/skeleton"

type LazyMountProps = {
  children: React.ReactNode
  /** Skeleton height while waiting (matches the rendered child). */
  minHeight?: number
  /** Distance ahead of viewport to start mounting. */
  rootMargin?: string
  className?: string
}

/**
 * Defers rendering of a child until it's about to enter the viewport.
 * Useful for heavy charts (recharts mount cost) below the fold.
 */
export function LazyMount({
  children,
  minHeight = 320,
  rootMargin = "200px",
  className,
}: LazyMountProps) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    if (visible) return
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [visible, rootMargin])

  return (
    <div ref={ref} style={{ minHeight }} className={className}>
      {visible ? children : <Skeleton style={{ height: minHeight }} className="w-full rounded-xl" />}
    </div>
  )
}
