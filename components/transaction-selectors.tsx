"use client"

import { useEffect, useState } from "react"
import { CustomSelect } from "@/components/ui/custom-select"
import { getCategories, getSupabaseClient } from "@/lib/supabase"
import { ADMIN_USER } from "@/lib/constants"
import { useParticipants } from "@/hooks/use-participants"
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
const categoriesSubscribers = new Set<() => void>()

export function invalidateCategoriesCache() {
    cachedCategories = null
    categoriesFetchPromise = null
    categoriesSubscribers.forEach(cb => cb())
}

function subscribeCategories(cb: () => void): () => void {
    categoriesSubscribers.add(cb)
    return () => { categoriesSubscribers.delete(cb) }
}

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
        let cancelled = false
        const sync = () => {
            if (cachedCategories) {
                if (!cancelled) {
                    setCategories(cachedCategories)
                    setLoading(false)
                }
                return
            }
            setLoading(true)
            loadCategoriesShared().then(result => {
                if (!cancelled) {
                    setCategories(result)
                    setLoading(false)
                }
            })
        }
        sync()
        const unsubscribe = subscribeCategories(sync)
        return () => { cancelled = true; unsubscribe() }
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

export function PayerSelector({ value, onChange, currentUser, disabled, className }: PayerSelectorProps) {
    const { active } = useParticipants()
    const isAdmin = currentUser === ADMIN_USER
    const isDisabled = disabled || !isAdmin

    // Stable list: members first, then guests; keeps current value selectable even if archived
    const candidates = active.map(p => p.name)
    const names = value && !candidates.includes(value) ? [value, ...candidates] : candidates
    const options = names.map(p => ({ value: p, label: p }))

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
