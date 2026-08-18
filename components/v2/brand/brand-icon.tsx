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
      aria-label="Dividc"
      className={cn("size-8 shrink-0 select-none", className)}
    >
      <defs>
        <linearGradient id="dividc-tile" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6E7FF1" />
          <stop offset="1" stopColor="#4E5ED7" />
        </linearGradient>
        <clipPath id="dividc-lens">
          <circle cx="12.9" cy="16" r="7" />
        </clipPath>
      </defs>

      <rect width="32" height="32" rx="8" fill="url(#dividc-tile)" />
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="7.25"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.10"
      />

      <g fill="none" stroke="#F4F5FD" strokeWidth="2.4">
        <circle cx="12.9" cy="16" r="7" />
        <circle cx="19.1" cy="16" r="7" />
      </g>
      <circle cx="19.1" cy="16" r="7" fill="#F4F5FD" clipPath="url(#dividc-lens)" />
    </svg>
  )
}
