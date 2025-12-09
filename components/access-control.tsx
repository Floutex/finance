"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"

const USERS = [
    { name: "Antônio", pin: "2202" },
    { name: "Júlia", pin: "3003" },
    { name: "Simões", pin: "3101" },
    { name: "Pietro", pin: "1234" },
]

interface AccessControlProps {
    onLogin: (user: string) => void
}

export function AccessControl({ onLogin }: AccessControlProps) {
    const [pin, setPin] = useState("")
    const [error, setError] = useState("")

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setPin(value)
        setError("")

        // Auto-login quando o PIN tiver 4 dígitos
        if (value.length === 4) {
            const user = USERS.find((u) => u.pin === value)
            if (user) {
                onLogin(user.name)
            } else {
                setError("PIN incorreto")
                setTimeout(() => {
                    setPin("")
                    setError("")
                }, 1500)
            }
        }
    }

    return (
        <div
            className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden"
            style={{
                background: "#000000"
            }}
        >
            {/* Animated gradient overlays */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    background: `
                        radial-gradient(circle at 0% 0%, #6B21A8 0%, transparent 50%),
                        radial-gradient(circle at 100% 0%, #1E40AF 0%, transparent 50%),
                        radial-gradient(circle at 100% 100%, #EA580C 0%, transparent 50%),
                        radial-gradient(circle at 0% 100%, #059669 0%, transparent 50%)
                    `,
                    animation: "pulse 8s ease-in-out infinite"
                }}
            />

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.5; }
                }
            `}</style>

            <Card className="w-full max-w-md bg-black/60 backdrop-blur-xl border-white/10 relative z-10">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                        <Lock className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-3xl text-white">Digite seu PIN</CardTitle>
                    <CardDescription className="text-white/60">Insira seu PIN de 4 dígitos</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Input
                            type="password"
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
        </div>
    )
}
