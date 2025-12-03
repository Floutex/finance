import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: Array<string | false | null | undefined>) => {
  return twMerge(clsx(inputs))
}

export const getUserGradient = (user: string | null) => {
  switch (user) {
    case "Simões": return "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-950/40 via-background to-background"
    case "Pietro": return "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/40 via-background to-background"
    case "Antônio": return "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-background to-background"
    case "Júlia": return "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/40 via-background to-background"
    default: return ""
  }
}

export const getUserColorClasses = (name: string) => {
  switch (name) {
    case "Simões": return "bg-green-500/10 text-green-400 border-green-500/20"
    case "Pietro": return "bg-orange-500/10 text-orange-400 border-orange-500/20"
    case "Antônio": return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    case "Júlia": return "bg-purple-500/10 text-purple-400 border-purple-500/20"
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20"
  }
}

