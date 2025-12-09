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

// Retorna a cor principal do usuário em formato HSL para uso em SVG
export const getUserColor = (name: string) => {
  switch (name) {
    case "Simões": return "hsl(142, 71%, 45%)"  // green-500
    case "Pietro": return "hsl(25, 95%, 53%)"   // orange-500
    case "Antônio": return "hsl(217, 91%, 60%)" // blue-500
    case "Júlia": return "hsl(271, 81%, 56%)"   // purple-500
    default: return "hsl(var(--primary))"
  }
}

// Retorna um array de cores para múltiplas categorias, priorizando as cores dos usuários
export const getUserColors = () => {
  return [
    "hsl(217, 91%, 60%)", // Antônio - blue
    "hsl(271, 81%, 56%)", // Júlia - purple
    "hsl(142, 71%, 45%)", // Simões - green
    "hsl(25, 95%, 53%)",  // Pietro - orange
    "hsl(199, 89%, 48%)", // cyan
    "hsl(43, 96%, 56%)",  // yellow
    "hsl(330, 81%, 60%)", // pink
    "hsl(0, 72%, 51%)"    // red
  ]
}

