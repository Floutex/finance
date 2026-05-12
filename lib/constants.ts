// ── Centralized user configuration ──
// Members (login via PIN) live here. Guests come from the `participants` table
// at runtime. For dynamic styling that mixes members + guests, use
// `getParticipantStyle` (below) and the v2 finance primitives.

export type UserConfig = {
  name: string
  pin: string
  /** Hex color used by avatars, badges and chart series. */
  hex: string
  /** HSL string for SVG / Recharts usage. */
  hsl: string
}

export const USERS: UserConfig[] = [
  { name: "Antônio", pin: "2202", hex: "#60A5FA", hsl: "hsl(210, 100%, 68%)" },
  { name: "Júlia", pin: "3003", hex: "#C084FC", hsl: "hsl(270, 95%, 72%)" },
  { name: "Simões", pin: "3101", hex: "#4ADE80", hsl: "hsl(140, 80%, 58%)" },
  { name: "Pietro", pin: "1234", hex: "#FB923C", hsl: "hsl(28, 100%, 62%)" },
]

/** Members that can manage monthly income. */
export const INCOME_USERS = ["Antônio", "Júlia"]

/** Admins (audit log, categories management, invite link, participants). */
export const ADMIN_USERS = ["Antônio", "Júlia", "Pietro"] as const

/** Convenience: is the given user name an admin? */
export const isAdminUser = (name: string | null | undefined): boolean =>
  !!name && (ADMIN_USERS as readonly string[]).includes(name)

/** @deprecated Use ADMIN_USERS / isAdminUser. Kept temporarily to avoid breakage. */
export const ADMIN_USER = ADMIN_USERS[0]

/** sessionStorage key for the currently logged-in user. */
export const SESSION_USER_KEY = "financas:user"

const userMap = new Map(USERS.map((u) => [u.name, u]))

/** Currency formatter (BRL). */
export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})
export const formatCurrency = (value: number) => currencyFormatter.format(value)

/** Normalize a user-typed number (accepts comma or dot). */
export const normalizeNumber = (value: string): number | null => {
  if (!value.trim()) return null
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

export const normalizeText = (value: string | null) => value?.trim() || ""

export const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1)

/** Marker used in `paid_by` to flag pending requests. */
export const PENDING_MARKER = "__PENDENTE__"

// ── Dynamic participant styling (works for any name with arbitrary hex) ──

const FALLBACK_HEX = "#64748b"

/** Convert "#RRGGBB" → "r, g, b" usable in rgba(...). */
function hexToRgbParts(hex: string): string {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "100, 116, 139"
  return `${r}, ${g}, ${b}`
}

/** Resolve a participant's hex color: prefer the dynamic record, fall back to
 *  the member palette. */
export function resolveHex(
  name: string,
  participants?: { name: string; color: string }[] | null
): string {
  if (participants) {
    const match = participants.find((p) => p.name === name)
    if (match) return match.color
  }
  return userMap.get(name)?.hex ?? FALLBACK_HEX
}

/** Inline style for a participant pill/badge — works for any name + any hex. */
export function getParticipantStyle(
  name: string,
  participants?: { name: string; color: string }[] | null
): { backgroundColor: string; color: string; borderColor: string } {
  const hex = resolveHex(name, participants)
  const rgb = hexToRgbParts(hex)
  return {
    backgroundColor: `rgba(${rgb}, 0.15)`,
    color: hex,
    borderColor: `rgba(${rgb}, 0.30)`,
  }
}

/** Solid-fill avatar style (used for stacked avatars on participants column). */
export function getParticipantAvatarStyle(
  name: string,
  participants?: { name: string; color: string }[] | null
): { backgroundColor: string; color: string } {
  const hex = resolveHex(name, participants)
  return { backgroundColor: hex, color: "#0a0a0a" }
}
