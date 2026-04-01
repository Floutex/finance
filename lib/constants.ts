// ── Centralized user configuration ──
// All user-related data lives here. Update this single file when adding/removing users.

export type UserConfig = {
  name: string
  pin: string
  /** Hex color used in access-control gradient */
  hex: string
  /** Tailwind badge classes: bg, text, border */
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
    hex: "#1E40AF",
    badgeClasses: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    hsl: "hsl(217, 91%, 60%)",
    gradient: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-background to-background",
  },
  {
    name: "Júlia",
    pin: "3003",
    hex: "#6B21A8",
    badgeClasses: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    hsl: "hsl(271, 81%, 56%)",
    gradient: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/40 via-background to-background",
  },
  {
    name: "Simões",
    pin: "3101",
    hex: "#EA580C",
    badgeClasses: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    hsl: "hsl(25, 95%, 53%)",
    gradient: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/40 via-background to-background",
  },
  {
    name: "Pietro",
    pin: "1234",
    hex: "#059669",
    badgeClasses: "bg-green-500/10 text-green-400 border-green-500/20",
    hsl: "hsl(142, 71%, 45%)",
    gradient: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-950/40 via-background to-background",
  },
]

/** Quick-access array of participant names */
export const PARTICIPANTS = USERS.map(u => u.name)

/** Lookup helpers (keyed by user name) */
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
  "hsl(199, 89%, 48%)", // cyan
  "hsl(43, 96%, 56%)",  // yellow
  "hsl(330, 81%, 60%)", // pink
  "hsl(0, 72%, 51%)",   // red
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
