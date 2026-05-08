"use client"

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"
import {
    fetchParticipants,
    getParticipantsFromCache,
    reloadParticipants,
    subscribeToParticipants,
    updateParticipantsCache,
    type Participant,
} from "@/lib/participants-cache"

export function useParticipants() {
    const cache = useSyncExternalStore(
        subscribeToParticipants,
        getParticipantsFromCache,
        getParticipantsFromCache
    )

    useEffect(() => {
        if (cache.data === null && !cache.loading) {
            fetchParticipants().catch(() => { })
        }
    }, [cache.data, cache.loading])

    const all = cache.data ?? []
    const active = useMemo(() => all.filter(p => !p.is_archived), [all])
    const members = useMemo(() => active.filter(p => p.kind === "member"), [active])
    const guests = useMemo(() => active.filter(p => p.kind === "guest"), [active])

    const reload = useCallback(async () => reloadParticipants(), [])
    const updateCache = useCallback(
        (updater: (prev: Participant[]) => Participant[]) => updateParticipantsCache(updater),
        []
    )

    return {
        all,
        active,
        members,
        guests,
        loading: cache.loading,
        error: cache.error,
        reload,
        updateCache,
    }
}
