"use client"

import { useEffect, useRef, useState } from "react"

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

type UseAnimatedNumberOptions = {
  /** Animation duration in milliseconds. Defaults to 750ms. */
  duration?: number
  /** When true, animation is disabled and targetValue is immediately returned. */
  disabled?: boolean
}

/**
 * Animates numeric value transitions smoothly using requestAnimationFrame.
 * Starts at 0 on initial mount for visible count-up effect and interpolates
 * between values on changes.
 */
export function useAnimatedNumber(
  targetValue: number,
  options: UseAnimatedNumberOptions = {}
): number {
  const { duration = 750, disabled = false } = options
  const target = Number.isFinite(targetValue) ? targetValue : 0

  const [displayValue, setDisplayValue] = useState<number>(() =>
    disabled ? target : 0
  )
  const currentValRef = useRef<number>(displayValue)
  currentValRef.current = displayValue

  useEffect(() => {
    if (disabled) {
      setDisplayValue(target)
      return
    }

    if (typeof window !== "undefined") {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
      if (prefersReducedMotion) {
        setDisplayValue(target)
        return
      }
    }

    const startVal = currentValRef.current

    if (startVal === target) {
      setDisplayValue(target)
      return
    }

    let frameId: number
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = easeOutExpo(progress)

      if (progress >= 1) {
        setDisplayValue(target)
      } else {
        const next = startVal + (target - startVal) * eased
        setDisplayValue(next)
        frameId = requestAnimationFrame(step)
      }
    }

    frameId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [target, duration, disabled])

  return disabled ? target : displayValue
}
