"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"
import { USERS } from "@/lib/constants"

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return "Bom dia"
    if (hour >= 12 && hour < 18) return "Boa tarde"
    return "Boa noite"
}

interface AccessControlProps {
    onLogin: (user: string) => void
}

type AnimationPhase = "idle" | "greeting" | "fadeout"

type Particle = {
    width: number
    height: number
    left: number
    top: number
    duration: number
    delay: number
}

function generateParticles(): Particle[] {
    return Array.from({ length: 8 }, () => ({
        width: Math.random() * 4 + 2,
        height: Math.random() * 4 + 2,
        left: Math.random() * 100,
        top: 50 + Math.random() * 30,
        duration: 1.5 + Math.random() * 2,
        delay: Math.random() * 0.8,
    }))
}

export function AccessControl({ onLogin }: AccessControlProps) {
    const [pin, setPin] = useState("")
    const [error, setError] = useState("")
    const [phase, setPhase] = useState<AnimationPhase>("idle")
    const [matchedUser, setMatchedUser] = useState<string>("")
    const [matchedColor, setMatchedColor] = useState<string>("")

    const fadeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const loginTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const greeting = useMemo(() => getGreeting(), [])
    const greetingText = `${greeting}, ${matchedUser}`

    // Particles are generated once when the greeting phase starts — not on every render.
    const [particles, setParticles] = useState<Particle[]>([])
    useEffect(() => {
        if (phase !== "idle" && particles.length === 0) {
            setParticles(generateParticles())
        }
    }, [phase, particles.length])

    useEffect(() => {
        return () => {
            if (fadeoutTimerRef.current) clearTimeout(fadeoutTimerRef.current)
            if (loginTimerRef.current) clearTimeout(loginTimerRef.current)
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
        }
    }, [])

    const startWelcomeAnimation = useCallback((userName: string, userColor: string) => {
        setMatchedUser(userName)
        setMatchedColor(userColor)
        setPhase("greeting")

        fadeoutTimerRef.current = setTimeout(() => setPhase("fadeout"), 2200)
        loginTimerRef.current = setTimeout(() => onLogin(userName), 2800)
    }, [onLogin])

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (phase !== "idle") return
        const value = e.target.value
        setPin(value)
        setError("")

        if (value.length === 4) {
            const user = USERS.find((u) => u.pin === value)
            if (user) {
                startWelcomeAnimation(user.name, user.hex)
            } else {
                setError("PIN incorreto")
                if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
                errorTimerRef.current = setTimeout(() => {
                    setPin("")
                    setError("")
                }, 1500)
            }
        }
    }

    const showCard = phase === "idle"
    const showGreeting = phase === "greeting" || phase === "fadeout"

    return (
        <div
            className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-black"
        >
            {/* Animated gradient overlays */}
            <div
                className="absolute inset-0 animate-bg-pulse will-change-transform"
                style={{
                    background: `
                        radial-gradient(circle at 0% 0%, ${USERS[1].hex} 0%, transparent 50%),
                        radial-gradient(circle at 100% 0%, ${USERS[0].hex} 0%, transparent 50%),
                        radial-gradient(circle at 100% 100%, ${USERS[2].hex} 0%, transparent 50%),
                        radial-gradient(circle at 0% 100%, ${USERS[3].hex} 0%, transparent 50%)
                    `,
                    opacity: showGreeting ? 0 : 0.3,
                    transition: "opacity 1s ease-in-out",
                }}
            />

            {matchedColor && (
                <div
                    className="absolute inset-0 animate-bg-pulse-fast will-change-transform"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${matchedColor} 0%, transparent 80%)`,
                        opacity: showGreeting ? 0.8 : 0,
                        transition: "opacity 1s ease-in-out",
                    }}
                />
            )}

            {/* PIN Card */}
            {showCard && (
                <Card className="w-full max-w-md bg-black/60 backdrop-blur-xl border-white/10 relative z-10">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                            <Lock className="h-8 w-8 text-white" />
                        </div>
                        <CardTitle className="text-3xl text-white">
                            Digite seu PIN
                        </CardTitle>
                        <CardDescription className="text-white/60">
                            Insira seu PIN de 4 dígitos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Input
                                type="password"
                                name="access_pin"
                                id="access_pin"
                                autoComplete="new-password"
                                maxLength={4}
                                value={pin}
                                onChange={handlePinChange}
                                className="text-center text-4xl h-20 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-white/20"
                                style={{ letterSpacing: '0.5em', paddingLeft: '0.5em' }}
                                placeholder="••••"
                                autoFocus
                            />
                            {error && (
                                <p className="text-sm text-red-400 text-center font-medium animate-pulse">
                                    {error}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Greeting Screen */}
            {showGreeting && (
                <div
                    className={
                        "absolute inset-0 flex flex-col items-center justify-center z-20 " +
                        (phase === "fadeout" ? "animate-greeting-out" : "animate-greeting-in")
                    }
                >
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {particles.map((p, i) => (
                            <div
                                key={i}
                                className="absolute rounded-full bg-white/20 animate-particle-rise"
                                style={{
                                    width: `${p.width}px`,
                                    height: `${p.height}px`,
                                    left: `${p.left}%`,
                                    top: `${p.top}%`,
                                    animationDuration: `${p.duration}s`,
                                    animationDelay: `${p.delay}s`,
                                }}
                            />
                        ))}
                    </div>

                    <h1
                        className="text-5xl md:text-7xl font-bold text-white animate-glow-pulse mb-4"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        {greetingText.split("").map((letter, i) => (
                            <span
                                key={i}
                                className="inline-block opacity-0 animate-letter-reveal"
                                style={{
                                    animationDelay: `${i * 50}ms`,
                                    ...(letter === " " ? { width: "0.3em" } : {}),
                                }}
                            >
                                {letter === " " ? " " : letter}
                            </span>
                        ))}
                    </h1>
                </div>
            )}
        </div>
    )
}
