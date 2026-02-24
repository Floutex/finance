import { forwardRef, type HTMLAttributes } from "react"
import { cn } from "./utils"

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { variant?: "default" | "highlight" }>((props, ref) => {
  const { className, variant = "default", ...rest } = props
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border bg-card text-card-foreground shadow-sm backdrop-blur-xl transition-all duration-300",
        variant === "default" && "border-border bg-black/40 hover:border-border/80 hover:bg-black/50 hover:shadow-md",
        variant === "highlight" && "border-primary/20 bg-gradient-to-br from-primary/5 via-primary/0 to-transparent hover:border-primary/40 hover:from-primary/10 hover:shadow-primary/5",
        className
      )}
      {...rest}
    />
  )
})

Card.displayName = "Card"

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => {
  const { className, ...rest } = props
  return <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...rest} />
})

CardHeader.displayName = "CardHeader"

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  (props, ref) => {
    const { className, ...rest } = props
    return <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...rest} />
  }
)

CardTitle.displayName = "CardTitle"

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  (props, ref) => {
    const { className, ...rest } = props
    return <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...rest} />
  }
)

CardDescription.displayName = "CardDescription"

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => {
  const { className, ...rest } = props
  return <div ref={ref} className={cn("p-6 pt-0", className)} {...rest} />
})

CardContent.displayName = "CardContent"

