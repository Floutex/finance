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

// Global cache that persists across component mounts
const cache: TransactionsCache = {
    data: null,
    loading: false,
    error: null,
    promise: null,
}

// Subscribers to notify when cache updates
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

export async function fetchTransactions(): Promise<Transaction[]> {
    // If already loading, return the existing promise
    if (cache.promise) {
        return cache.promise
    }

    // If we have cached data, return it immediately
    if (cache.data !== null) {
        return Promise.resolve(cache.data)
    }

    cache.loading = true
    cache.error = null
    notifySubscribers()

    const supabase = getSupabaseClient()

    const loadData = async (): Promise<Transaction[]> => {
        try {
            const { data, error } = await supabase
                .from("shared_transactions")
                .select("*")
                .order("date", { ascending: false })
                .order("created_at", { ascending: false })

            if (error) {
                cache.error = error.message
                cache.data = []
                throw error
            }

            cache.data = data ?? []
            return cache.data
        } finally {
            cache.loading = false
            cache.promise = null
            notifySubscribers()
        }
    }

    cache.promise = loadData()
    return cache.promise
}

export function updateTransactionsCache(updater: (prev: Transaction[]) => Transaction[]) {
    if (cache.data === null) {
        return
    }
    cache.data = updater(cache.data)
    notifySubscribers()
}

export function invalidateTransactionsCache() {
    cache.data = null
    cache.loading = false
    cache.error = null
    cache.promise = null
}

export async function reloadTransactions(): Promise<Transaction[]> {
    invalidateTransactionsCache()
    return fetchTransactions()
}

// Start prefetching immediately when this module is imported
if (typeof window !== "undefined") {
    fetchTransactions().catch(() => {
        // Silently handle prefetch errors - they'll be handled when the component mounts
    })
}
