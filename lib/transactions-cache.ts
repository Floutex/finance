"use client"

import { getSupabaseClient } from "@/lib/supabase"
import type { Tables } from "@/lib/database.types"

type Transaction = Tables<"shared_transactions">

interface TransactionsCache {
    data: Transaction[] | null
    loading: boolean
    error: string | null
    promise: Promise<Transaction[]> | null
}

// Global cache that persists across component mounts. The object is REPLACED
// (not mutated) on every state change so useSyncExternalStore snapshots
// compare unequal and subscribers actually re-render.
let cache: TransactionsCache = {
    data: null,
    loading: false,
    error: null,
    promise: null,
}

function setCacheState(patch: Partial<TransactionsCache>) {
    cache = { ...cache, ...patch }
    notifySubscribers()
}

const subscribers = new Set<() => void>()

function notifySubscribers() {
    subscribers.forEach((callback) => callback())
}

export function subscribeToTransactions(callback: () => void): () => void {
    subscribers.add(callback)
    return () => {
        subscribers.delete(callback)
    }
}

export function getTransactionsFromCache(): TransactionsCache {
    return cache
}

async function runFetch(): Promise<Transaction[]> {
    const supabase = getSupabaseClient()
    try {
        const { data, error } = await supabase
            .from("shared_transactions")
            .select("*")
            .eq("is_hidden", false)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })

        if (error) {
            setCacheState({ error: error.message, data: cache.data ?? [], loading: false, promise: null })
            throw error
        }
        setCacheState({ data: data ?? [], loading: false, promise: null, error: null })
        return data ?? []
    } catch (e) {
        setCacheState({ loading: false, promise: null })
        throw e
    }
}

export async function fetchTransactions(): Promise<Transaction[]> {
    if (cache.promise) return cache.promise
    if (cache.data !== null) return Promise.resolve(cache.data)

    const promise = runFetch()
    setCacheState({ loading: true, error: null, promise })
    return promise
}

export function updateTransactionsCache(updater: (prev: Transaction[]) => Transaction[]) {
    if (cache.data === null) return
    setCacheState({ data: updater(cache.data) })
}

export function invalidateTransactionsCache() {
    setCacheState({ data: null, loading: false, error: null, promise: null })
}

/**
 * Force a refetch but KEEP the existing `cache.data` visible to consumers
 * until the fresh data arrives — avoids flashing an empty list. If there is no
 * data yet, falls back to the initial fetch behavior.
 */
export async function reloadTransactions(): Promise<Transaction[]> {
    if (cache.data === null) {
        setCacheState({ promise: null })
        return fetchTransactions()
    }
    if (cache.promise) return cache.promise

    const promise = runFetch()
    setCacheState({ loading: true, error: null, promise })
    return promise
}

// Start prefetching immediately when this module is imported
if (typeof window !== "undefined") {
    fetchTransactions().catch(() => {
        // Silently handle prefetch errors - they'll surface via cache.error
    })
}
