export function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "h-72 w-full rounded-2xl border border-border/40 bg-black/20 animate-pulse " +
        className
      }
      aria-hidden="true"
    />
  )
}
