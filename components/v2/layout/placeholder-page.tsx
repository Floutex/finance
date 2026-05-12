import * as React from "react"
import { Construction } from "lucide-react"

type PlaceholderPageProps = {
  eyebrow?: string
  title: string
  description?: string
  phase?: string
}

/**
 * Shared placeholder for routes that exist in the navigation but haven't been
 * built yet. Removed as each phase lands its real implementation.
 */
export function PlaceholderPage({
  eyebrow,
  title,
  description,
  phase = "Em construção",
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-8 px-8 py-16">
      <header className="space-y-2">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </header>

      <div className="surface-1 flex w-full items-center gap-4 rounded-xl p-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
          <Construction className="size-5" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{phase}</p>
          <p className="text-xs text-muted-foreground">
            Esta tela será implementada em uma fase posterior do rework.
          </p>
        </div>
      </div>
    </div>
  )
}
