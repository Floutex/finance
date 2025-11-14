import { forwardRef, type LabelHTMLAttributes } from "react"
import { cn } from "./utils"

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  (props, ref) => {
    const { className, ...rest } = props
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        {...rest}
      />
    )
  }
)

Label.displayName = "Label"

