import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: Array<string | false | null | undefined>) => {
  return twMerge(clsx(inputs))
}

// Re-export user utilities from centralized constants so existing imports keep working
export { getUserGradient, getUserColorClasses, getUserColor, getUserColors } from "@/lib/constants"
