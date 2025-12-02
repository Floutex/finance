"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Lock } from "lucide-react"

const USERS = [
    { name: "Antônio", pin: "1111" },
    { name: "Júlia", pin: "2222" },
    { name: "Simões", pin: "3333" },
    { name: "Pietro", pin: "4444" },
]

interface AccessControlProps {
    onLogin: (user: string) => void
}

export function AccessControl({ onLogin }: AccessControlProps) {
    const [selectedUser, setSelectedUser] = useState<string | null>(null)
    const [pin, setPin] = useState("")
    const [error, setError] = useState("")

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        const user = USERS.find((u) => u.name === selectedUser)
        if (user && user.pin === pin) {
            onLogin(user.name)
        } else {
            setError("PIN incorreto")
        }
    }

    if (!selectedUser) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Quem é você?</CardTitle>
                        <CardDescription>Selecione seu perfil para continuar</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {USERS.map((user) => (
                            <Button
                                key={user.name}
                                variant="outline"
                                className="h-14 text-lg justify-start px-6"
                                onClick={() => setSelectedUser(user.name)}
                            >
                                {user.name}
                            </Button>
                        ))}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex min-h-[80vh] items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Olá, {selectedUser}</CardTitle>
                    <CardDescription>Digite seu PIN para acessar</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pin">PIN de 4 dígitos</Label>
                            <Input
                                id="pin"
                                type="password"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => {
                                    setPin(e.target.value)
                                    setError("")
                                }}
                                className="text-center text-2xl tracking-widest"
                                autoFocus
                            />
                            {error && <p className="text-sm text-destructive text-center">{error}</p>}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                className="flex-1"
                                onClick={() => {
                                    setSelectedUser(null)
                                    setPin("")
                                    setError("")
                                }}
                            >
                                Voltar
                            </Button>
                            <Button type="submit" className="flex-1">
                                Entrar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
