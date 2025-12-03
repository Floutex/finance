import { forwardRef, type HTMLAttributes } from "react"
import { cn } from "./utils"

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => {
  const { className, ...rest } = props
  return (
    <div
      ref={ref}
      className={cn("rounded-lg border border-border bg-black/40 text-card-foreground shadow-sm backdrop-blur-xl", className)}
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

