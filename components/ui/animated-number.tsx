"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/components/ui/utils"

interface AnimatedNumberProps {
    value: number
    formatFn?: (value: number) => string
    className?: string
    duration?: number
    delay?: number
    containerProps?: React.HTMLAttributes<HTMLSpanElement>
    animateOnMount?: boolean
    initialValue?: number
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
    delay = 0,
    containerProps,
    animateOnMount = false,
    initialValue = 0
}: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(animateOnMount ? initialValue : value)
    const previousValueRef = useRef(animateOnMount ? initialValue : value)
    const animationRef = useRef<number>()
    const timeoutRef = useRef<NodeJS.Timeout>()
    const hasInitialized = useRef(animateOnMount)

    useEffect(() => {
        // Immediate set on mount if not animating on mount
        if (!hasInitialized.current) {
            setDisplayValue(value)
            previousValueRef.current = value
            hasInitialized.current = true
            return
        }

        if (previousValueRef.current === value) {
            return
        }

        const startValue = previousValueRef.current
        const endValue = value

        const startAnimation = () => {
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
        }

        if (delay > 0) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(startAnimation, delay)
        } else {
            startAnimation()
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [value, duration, delay])

    return (
        <span className={cn("tabular-nums", className)} {...containerProps}>
            {formatFn(displayValue)}
        </span>
    )
}
