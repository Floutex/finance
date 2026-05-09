// ── Centralized user configuration ──
// Members (login via PIN) live here. Guests come from the `participants` table at runtime.
// For dynamic styling that mixes members + guests, use getParticipantStyle (below).

export type UserConfig = {
  name: string
  pin: string
  /** Hex color used in access-control gradient */
  hex: string
  /** Tailwind badge classes: bg, text, border (members only — for legacy fallback) */
  badgeClasses: string
  /** HSL string for SVG / Recharts usage */
  hsl: string
  /** Tailwind gradient class for the dashboard background */
  gradient: string
}

export const USERS: UserConfig[] = [
  {
    name: "Antônio",
    pin: "2202",
    hex: "#60A5FA",
    badgeClasses: "bg-blue-500/15 text-blue-300 border-blue-400/30",
    hsl: "hsl(210, 100%, 68%)",
    gradient: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-background to-background",
  },
  {
    name: "Júlia",
    pin: "3003",
    hex: "#C084FC",
    badgeClasses: "bg-purple-500/15 text-purple-300 border-purple-400/30",
    hsl: "hsl(270, 95%, 72%)",
    gradient: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/40 via-background to-background",
  },
  {
    name: "Simões",
    pin: "3101",
    hex: "#4ADE80",
    badgeClasses: "bg-green-500/15 text-green-300 border-green-400/30",
    hsl: "hsl(140, 80%, 58%)",
    gradient: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-950/40 via-background to-background",
  },
  {
    name: "Pietro",
    pin: "1234",
    hex: "#FB923C",
    badgeClasses: "bg-orange-500/15 text-orange-300 border-orange-400/30",
    hsl: "hsl(28, 100%, 62%)",
    gradient: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/40 via-background to-background",
  },
]

/** Members that can manage monthly income */
export const INCOME_USERS = ["Antônio", "Júlia"]

/** Admin (audit log, categories management, invite link) */
export const ADMIN_USER = "Antônio"

/** sessionStorage key for the currently logged-in user (shared between / and /admin) */
export const SESSION_USER_KEY = "financas:user"

/** @deprecated Use useParticipants() hook instead. Static array kept only as a fallback for transactions persisted before the participants table existed. */
export const PARTICIPANTS = USERS.map(u => u.name)

const userMap = new Map(USERS.map(u => [u.name, u]))

export const getUserConfig = (name: string): UserConfig | undefined => userMap.get(name)

export const getUserGradient = (name: string | null): string =>
  (name && userMap.get(name)?.gradient) || ""

export const getUserColorClasses = (name: string): string =>
  userMap.get(name)?.badgeClasses ?? "bg-slate-500/10 text-slate-400 border-slate-500/20"

export const getUserColor = (name: string): string =>
  userMap.get(name)?.hsl ?? "hsl(var(--primary))"

export const getUserHex = (name: string): string =>
  userMap.get(name)?.hex ?? "#64748b"

/** Ordered color palette: user colors first, then extras for categories */
export const getUserColors = (): string[] => [
  ...USERS.map(u => u.hsl),
  "hsl(199, 89%, 48%)",
  "hsl(43, 96%, 56%)",
  "hsl(330, 81%, 60%)",
  "hsl(0, 72%, 51%)",
]

/** Currency formatter (BRL) */
export const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
export const formatCurrency = (value: number) => currencyFormatter.format(value)

/** Normalize a user-typed number (accepts comma or dot) */
export const normalizeNumber = (value: string): number | null => {
  if (!value.trim()) return null
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

export const normalizeText = (value: string | null) => value?.trim() || ""

export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

export const PENDING_MARKER = "__PENDENTE__"

// ── Dynamic participant styling (works for any name with arbitrary hex) ──

const FALLBACK_HEX = "#64748b"

/** Convert "#RRGGBB" → "r, g, b" usable in rgba(...) */
function hexToRgbParts(hex: string): string {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "100, 116, 139"
  return `${r}, ${g}, ${b}`
}

/** Resolve a participant's hex color: prefer the dynamic record, fall back to the member palette. */
export function resolveHex(name: string, participants?: { name: string; color: string }[] | null): string {
  if (participants) {
    const match = participants.find(p => p.name === name)
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
  return {
    backgroundColor: hex,
    color: "#0a0a0a",
  }
}
