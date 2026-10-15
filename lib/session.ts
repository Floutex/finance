import { SESSION_USER_KEY } from "@/lib/constants"

export type Session = {
  name: string
  token?: string
}

const STORAGE_KEY = "zera:session"

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Session>
      if (typeof parsed?.name === "string" && parsed.name) {
        return {
          name: parsed.name,
          ...(typeof parsed.token === "string" && parsed.token ? { token: parsed.token } : {}),
        }
      }
    }
    // Sessões abertas antes da sessão persistente ficavam no sessionStorage.
    const legacy = sessionStorage.getItem(SESSION_USER_KEY)
    if (legacy) {
      const session = { name: legacy }
      writeSession(session)
      sessionStorage.removeItem(SESSION_USER_KEY)
      return session
    }
  } catch {}
  return null
}

export function writeSession(session: Session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(SESSION_USER_KEY)
  } catch {}
}

/**
 * Pergunta ao servidor se a sessão ainda vale. Devolve o nome atual do
 * participante (pode ter sido renomeado), `null` se foi revogada/arquivada,
 * ou `undefined` se não deu pra checar (offline): aí a sessão é mantida.
 */
export async function validateSession(session: Session): Promise<string | null | undefined> {
  try {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
      cache: "no-store",
    })
    if (res.status === 401) return null
    if (!res.ok) return undefined
    const json = (await res.json()) as { name?: string }
    return json.name ?? undefined
  } catch {
    return undefined
  }
}
