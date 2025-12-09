"use client"

import { useEffect, useState } from "react"
import { CustomSelect } from "@/components/ui/custom-select"
import { getCategories, upsertCategory, getSupabaseClient } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface CategorySelectorProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    className?: string
}

export function CategorySelector({ value, onChange, disabled, className }: CategorySelectorProps) {
    const [categories, setCategories] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const supabase = getSupabaseClient()

                // 1. Ensure required categories exist
                await Promise.all([
                    upsertCategory("Outros"),
                    upsertCategory("Ingressos")
                ])

                // 2. Fetch defined categories
                const { data: definedCategories } = await getCategories()
                const definedNames = definedCategories?.map(c => c.name) || []

                // 3. Fetch used categories from transactions
                const { data: transactions } = await supabase
                    .from("shared_transactions")
                    .select("category")
                    .not("category", "is", null)

                const usedCategories = transactions
                    ?.map(t => t.category)
                    .filter((c): c is string => !!c) || []

                // 4. Merge and sort
                const allCategories = Array.from(new Set([...definedNames, ...usedCategories]))
                    .sort((a, b) => a.localeCompare(b, "pt-BR"))

                setCategories(allCategories)
            } catch (error) {
                console.error("Failed to load categories", error)
            } finally {
                setLoading(false)
            }
        }

        loadCategories()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
            </div>
        )
    }

    const options = categories.map(c => ({ value: c, label: c }))

    return (
        <CustomSelect
            value={value}
            onChange={onChange}
            options={options}
            placeholder="Selecione uma categoria..."
            disabled={disabled}
            className={className}
            searchable
        />
    )
}

interface PayerSelectorProps {
    value: string
    onChange: (value: string) => void
    currentUser: string
    disabled?: boolean
    className?: string
}

const PARTICIPANTS = ["Antônio", "Júlia", "Simões", "Pietro"]

export function PayerSelector({ value, onChange, currentUser, disabled, className }: PayerSelectorProps) {
    const isAntonio = currentUser === "Antônio"
    const isDisabled = disabled || !isAntonio

    const options = PARTICIPANTS.map(p => ({ value: p, label: p }))

    return (
        <CustomSelect
            value={value}
            onChange={onChange}
            options={options}
            placeholder="Selecione..."
            disabled={isDisabled}
            className={className}
        />
    )
}
