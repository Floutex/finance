"use client"

import { useEffect, useState } from "react"
import { CustomSelect } from "@/components/ui/custom-select"
import { getCategories, getSupabaseClient } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface CategorySelectorProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    className?: string
}

// Module-level cache for categories
let cachedCategories: string[] | null = null
let categoriesFetchPromise: Promise<string[]> | null = null

async function loadCategoriesShared(): Promise<string[]> {
    if (cachedCategories) return cachedCategories
    if (categoriesFetchPromise) return categoriesFetchPromise

    categoriesFetchPromise = (async () => {
        try {
            const supabase = getSupabaseClient()

            // Fetch defined categories
            const { data: definedCategories } = await getCategories()
            const definedNames = definedCategories?.map(c => c.name) || []

            // Fetch used categories from transactions
            const { data: transactions } = await supabase
                .from("shared_transactions")
                .select("category")
                .not("category", "is", null)

            const usedCategories = transactions
                ?.map(t => t.category)
                .filter((c): c is string => !!c) || []

            // Merge and sort
            cachedCategories = Array.from(new Set([...definedNames, ...usedCategories]))
                .sort((a, b) => a.localeCompare(b, "pt-BR"))

            return cachedCategories
        } catch (error) {
            console.error("Failed to load categories", error)
            return []
        } finally {
            categoriesFetchPromise = null
        }
    })()

    return categoriesFetchPromise
}

export function CategorySelector({ value, onChange, disabled, className }: CategorySelectorProps) {
    const [categories, setCategories] = useState<string[]>(() => cachedCategories ?? [])
    const [loading, setLoading] = useState(cachedCategories === null)

    useEffect(() => {
        if (cachedCategories) {
            setCategories(cachedCategories)
            setLoading(false)
            return
        }

        let cancelled = false
        loadCategoriesShared().then(result => {
            if (!cancelled) {
                setCategories(result)
                setLoading(false)
            }
        })
        return () => { cancelled = true }
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
