"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/components/ui/utils"

interface AnimatedNumberProps {
    value: number
    formatFn?: (value: number) => string
    className?: string
    duration?: number
    containerProps?: React.HTMLAttributes<HTMLSpanElement>
}

// Easing function: easeOutExpo
const easeOutExpo = (x: number): number => {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
}

export function AnimatedNumber({
    value,
    formatFn = (val) => val.toString(),
    className,
    duration = 800,
    containerProps
}: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(value)
    const previousValueRef = useRef(value)
    const animationRef = useRef<number>()
    const hasInitialized = useRef(false)

    useEffect(() => {
        // Immediate set on mount
        if (!hasInitialized.current) {
            setDisplayValue(value)
            previousValueRef.current = value
            hasInitialized.current = true
            return
        }

        if (previousValueRef.current === value) {
            return
        }

        const startValue = displayValue // Animate from whatever is currently displayed
        const endValue = value
        const startTime = performance.now()

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)

            const easedProgress = easeOutExpo(progress)
            const currentVal = startValue + (endValue - startValue) * easedProgress

            setDisplayValue(currentVal)

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                setDisplayValue(endValue)
                previousValueRef.current = endValue
            }
        }

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        animationRef.current = requestAnimationFrame(animate)

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [value, duration]) // displayValue intentionally omitted from deps to avoid re-triggering animation on every frame

    return (
        <span className={cn("tabular-nums", className)} {...containerProps}>
            {formatFn(displayValue)}
        </span>
    )
}
