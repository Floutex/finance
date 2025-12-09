"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import type { Tables } from "@/lib/database.types"
import {
    fetchTransactions,
    getTransactionsFromCache,
    reloadTransactions,
    subscribeToTransactions,
    updateTransactionsCache,
} from "@/lib/transactions-cache"

type Transaction = Tables<"shared_transactions">

export function useTransactions() {
    const cache = useSyncExternalStore(
        subscribeToTransactions,
        getTransactionsFromCache,
        getTransactionsFromCache
    )

    useEffect(() => {
        // If no data yet and not loading, trigger fetch
        if (cache.data === null && !cache.loading) {
            fetchTransactions().catch(() => {
                // Error handling is done in the cache
            })
        }
    }, [cache.data, cache.loading])

    const refetch = useCallback(async () => {
        return fetchTransactions()
    }, [])

    const reload = useCallback(async () => {
        return reloadTransactions()
    }, [])

    const updateCache = useCallback((updater: (prev: Transaction[]) => Transaction[]) => {
        updateTransactionsCache(updater)
    }, [])

    return {
        transactions: cache.data ?? [],
        loading: cache.loading,
        error: cache.error,
        refetch,
        reload,
        updateCache,
    }
}
