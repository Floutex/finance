import { cn } from "@/components/v2/primitives/utils"

interface BrandIconProps {
  className?: string
}

export function BrandIcon({ className }: BrandIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      role="img"
      aria-label="Zera"
      className={cn("size-7 shrink-0 select-none text-foreground", className)}
    >
      <defs>
        <clipPath id="zera-lens">
          <circle cx="11.5" cy="16" r="8.5" />
        </clipPath>
      </defs>

      <g fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="11.5" cy="16" r="8.5" />
        <circle cx="20.5" cy="16" r="8.5" />
      </g>
      <circle
        cx="20.5"
        cy="16"
        r="8.5"
        fill="currentColor"
        clipPath="url(#zera-lens)"
      />
    </svg>
  )
}
