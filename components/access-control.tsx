"use client"

import { useState, useCallback, useMemo } from "react"
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

export function AccessControl({ onLogin }: AccessControlProps) {
    const [pin, setPin] = useState("")
    const [error, setError] = useState("")
    const [phase, setPhase] = useState<AnimationPhase>("idle")
    const [matchedUser, setMatchedUser] = useState<string>("")
    const [matchedColor, setMatchedColor] = useState<string>("")

    const greeting = useMemo(() => getGreeting(), [])

    const greetingText = `${greeting}, ${matchedUser}`

    const startWelcomeAnimation = useCallback((userName: string, userColor: string) => {
        setMatchedUser(userName)
        setMatchedColor(userColor)

        // Go straight to greeting phase
        setPhase("greeting")

        // Phase 2: Show greeting for 2200ms then fade out
        setTimeout(() => {
            setPhase("fadeout")
        }, 2200)

        // Phase 3: Complete login after fade
        setTimeout(() => {
            onLogin(userName)
        }, 2800)
    }, [onLogin])

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (phase !== "idle") return
        const value = e.target.value
        setPin(value)
        setError("")

        // Auto-login quando o PIN tiver 4 dígitos
        if (value.length === 4) {
            const user = USERS.find((u) => u.pin === value)
            if (user) {
                startWelcomeAnimation(user.name, user.hex)
            } else {
                setError("PIN incorreto")
                setTimeout(() => {
                    setPin("")
                    setError("")
                }, 1500)
            }
        }
    }

    // Determine visibility states
    const showCard = phase === "idle"
    const showGreeting = phase === "greeting" || phase === "fadeout"

    return (
        <div
            className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden"
            style={{
                background: "#000000"
            }}
        >
            {/* Animated gradient overlays - Default multi-color */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
                        radial-gradient(circle at 0% 0%, ${USERS[1].hex} 0%, transparent 50%),
                        radial-gradient(circle at 100% 0%, ${USERS[0].hex} 0%, transparent 50%),
                        radial-gradient(circle at 100% 100%, ${USERS[2].hex} 0%, transparent 50%),
                        radial-gradient(circle at 0% 100%, ${USERS[3].hex} 0%, transparent 50%)
                    `,
                    opacity: showGreeting ? 0 : 0.3,
                    transition: "opacity 1s ease-in-out",
                    animation: "bgPulse 8s ease-in-out infinite"
                }}
            />

            {/* Personalized color overlay for the logged-in user */}
            {matchedColor && (
                <div
                    className="absolute inset-0"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${matchedColor} 0%, transparent 80%)`,
                        opacity: showGreeting ? 0.8 : 0,
                        transition: "opacity 1s ease-in-out",
                        animation: "bgPulseFast 3s ease-in-out infinite"
                    }}
                />
            )}

            <style jsx>{`
                @keyframes bgPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                @keyframes bgPulseFast {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 1; }
                }

                @keyframes cardFade {
                    0% { opacity: 1; transform: scale(1) translateY(0); }
                    100% { opacity: 0; transform: scale(0.95) translateY(20px); }
                }

                @keyframes greetingIn {
                    0% { opacity: 0; transform: translateY(30px); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                @keyframes greetingOut {
                    0% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(1.05); }
                }

                @keyframes letterReveal {
                    0% { opacity: 0; transform: translateY(20px) scale(0.8); filter: blur(8px); }
                    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }

                @keyframes glowPulse {
                    0%, 100% { text-shadow: 0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.1); }
                    50% { text-shadow: 0 0 30px rgba(255,255,255,0.5), 0 0 60px rgba(255,255,255,0.2), 0 0 80px rgba(255,255,255,0.1); }
                }

                @keyframes particles {
                    0% { opacity: 0; transform: translateY(0) scale(0); }
                    50% { opacity: 1; }
                    100% { opacity: 0; transform: translateY(-100px) scale(1); }
                }

                .greeting-container {
                    animation: greetingIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .greeting-fadeout {
                    animation: greetingOut 0.6s ease-in-out forwards;
                }

                .greeting-letter {
                    display: inline-block;
                    opacity: 0;
                    animation: letterReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .greeting-glow {
                    animation: glowPulse 2s ease-in-out infinite;
                }

                .greeting-glow {
                    animation: glowPulse 2s ease-in-out infinite;
                }
            `}</style>

            {/* ─── PIN Card ─── */}
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

            {/* ─── Greeting Screen ─── */}
            {showGreeting && (
                <div
                    className={`absolute inset-0 flex flex-col items-center justify-center z-20 ${phase === "fadeout" ? "greeting-fadeout" : "greeting-container"}`}
                >
                    {/* Decorative particles */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute rounded-full bg-white/20"
                                style={{
                                    width: `${Math.random() * 4 + 2}px`,
                                    height: `${Math.random() * 4 + 2}px`,
                                    left: `${Math.random() * 100}%`,
                                    top: `${50 + Math.random() * 30}%`,
                                    animation: `particles ${1.5 + Math.random() * 2}s ease-out ${Math.random() * 0.8}s forwards`
                                }}
                            />
                        ))}
                    </div>

                    {/* Greeting text */}
                    <h1
                        className="text-5xl md:text-7xl font-bold text-white greeting-glow mb-4"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        {greetingText.split("").map((letter, i) => (
                            <span
                                key={i}
                                className="greeting-letter"
                                style={{
                                    animationDelay: `${i * 50}ms`,
                                    ...(letter === " " ? { width: "0.3em", display: "inline-block" } : {})
                                }}
                            >
                                {letter === " " ? "\u00A0" : letter}
                            </span>
                        ))}
                    </h1>
                </div>
            )}
        </div>
    )
}
