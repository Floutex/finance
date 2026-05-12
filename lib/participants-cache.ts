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

let cache: ParticipantsCache = {
    data: null,
    loading: false,
    error: null,
    promise: null,
}

function setCacheState(patch: Partial<ParticipantsCache>) {
    cache = { ...cache, ...patch }
    notifySubscribers()
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

async function runFetch(): Promise<Participant[]> {
    const supabase = getSupabaseClient()
    try {
        const { data, error } = await supabase
            .from("participants")
            .select("*")
            .order("kind", { ascending: true })
            .order("name", { ascending: true })
        if (error) {
            setCacheState({
                error: error.message,
                data: cache.data ?? [],
                loading: false,
                promise: null,
            })
            throw error
        }
        setCacheState({ data: data ?? [], loading: false, promise: null, error: null })
        return data ?? []
    } catch (e) {
        setCacheState({ loading: false, promise: null })
        throw e
    }
}

export async function fetchParticipants(): Promise<Participant[]> {
    if (cache.promise) return cache.promise
    if (cache.data !== null) return Promise.resolve(cache.data)

    const promise = runFetch()
    setCacheState({ loading: true, error: null, promise })
    return promise
}

export function updateParticipantsCache(updater: (prev: Participant[]) => Participant[]) {
    if (cache.data === null) return
    setCacheState({ data: updater(cache.data) })
}

export function invalidateParticipantsCache() {
    setCacheState({ data: null, loading: false, error: null, promise: null })
}

export async function reloadParticipants(): Promise<Participant[]> {
    if (cache.data === null) {
        setCacheState({ promise: null })
        return fetchParticipants()
    }
    if (cache.promise) return cache.promise
    const promise = runFetch()
    setCacheState({ loading: true, error: null, promise })
    return promise
}

if (typeof window !== "undefined") {
    fetchParticipants().catch(() => { })
}
