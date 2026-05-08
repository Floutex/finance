"use client"

import { getSupabaseClient } from "@/lib/supabase"
import type { Tables } from "@/lib/database.types"

export type Participant = Tables<"participants">

interface ParticipantsCache {
    data: Participant[] | null
    loading: boolean
    error: string | null
    promise: Promise<Participant[]> | null
}

const cache: ParticipantsCache = {
    data: null,
    loading: false,
    error: null,
    promise: null,
}

const subscribers = new Set<() => void>()

function notifySubscribers() {
    subscribers.forEach((callback) => callback())
}

export function subscribeToParticipants(callback: () => void): () => void {
    subscribers.add(callback)
    return () => {
        subscribers.delete(callback)
    }
}

export function getParticipantsFromCache(): ParticipantsCache {
    return cache
}

export async function fetchParticipants(): Promise<Participant[]> {
    if (cache.promise) return cache.promise
    if (cache.data !== null) return Promise.resolve(cache.data)

    cache.loading = true
    cache.error = null
    notifySubscribers()

    const supabase = getSupabaseClient()

    const loadData = async (): Promise<Participant[]> => {
        try {
            const { data, error } = await supabase
                .from("participants")
                .select("*")
                .order("kind", { ascending: true })
                .order("name", { ascending: true })
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

export function updateParticipantsCache(updater: (prev: Participant[]) => Participant[]) {
    if (cache.data === null) return
    cache.data = updater(cache.data)
    notifySubscribers()
}

export function invalidateParticipantsCache() {
    cache.data = null
    cache.loading = false
    cache.error = null
    cache.promise = null
}

export async function reloadParticipants(): Promise<Participant[]> {
    invalidateParticipantsCache()
    return fetchParticipants()
}

if (typeof window !== "undefined") {
    fetchParticipants().catch(() => { })
}
