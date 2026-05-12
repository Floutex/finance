/**
 * Design tokens — Gastos Compartilhados v2.
 *
 * Single source of truth for non-Tailwind values (motion, semantic durations,
 * participant tinting helpers). Tailwind utilities + CSS vars in
 * app/v2/globals.css cover colors, radii, typography and spacing.
 */

// ── Motion ──────────────────────────────────────────────────────────────────
export const duration = {
  instant: 75,
  fast: 150,
  base: 250,
  slow: 400,
} as const

export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  emphasized: "cubic-bezier(0.3, 0, 0, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
} as const

// ── Participant color helpers ───────────────────────────────────────────────
// Works with both static members (lib/constants.USERS) and dynamic participants
// from the `participants` Supabase table. Input is always a hex color.

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "").trim()
  if (clean.length !== 6) return null
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return { r, g, b }
}

/** rgba(r, g, b, alpha) — alpha in [0, 1]. Falls back to neutral slate. */
export function tintFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex) ?? { r: 100, g: 116, b: 139 }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/** Returns a contrasting foreground (black/white) for a given hex background. */
export function contrastOn(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return "#ffffff"
  // Relative luminance per WCAG.
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const L =
    0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b)
  return L > 0.55 ? "#0a0a0a" : "#fafafa"
}

/** Badge style tokens for a participant hex. */
export function participantBadge(hex: string) {
  return {
    backgroundColor: tintFromHex(hex, 0.12),
    color: hex,
    borderColor: tintFromHex(hex, 0.3),
  }
}

/** Solid avatar style for a participant hex. */
export function participantAvatar(hex: string) {
  return {
    backgroundColor: hex,
    color: contrastOn(hex),
  }
}

// ── Chart palette ───────────────────────────────────────────────────────────
// Used for category pie series and any chart that needs a deterministic series
// color. Order is intentional: cool → warm.
export const chartPalette = [
  "hsl(210 90% 60%)",
  "hsl(270 80% 65%)",
  "hsl(140 70% 50%)",
  "hsl(28 90% 58%)",
  "hsl(195 85% 50%)",
  "hsl(45 95% 55%)",
  "hsl(330 75% 60%)",
  "hsl(0 70% 55%)",
] as const

// ── Numeric formatting ──────────────────────────────────────────────────────
// Re-exports from lib/constants to keep imports centralized for v2 consumers.
export { formatCurrency, normalizeNumber, currencyFormatter } from "@/lib/constants"
