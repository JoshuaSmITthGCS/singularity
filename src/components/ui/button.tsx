import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Focus rings come from the global :focus-visible rule in globals.css; variants
// only re-point --focus-ring when their own color demands it.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-accent bg-accent text-white hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)]",
        secondary: "border-rule-strong bg-surface text-ink hover:bg-sunken",
        ghost: "border-transparent text-ink-2 hover:bg-sunken hover:text-ink",
        danger: "border-fail bg-fail text-white hover:bg-[#8d1a2c] [--focus-ring:var(--fail)]",
        // Sits on the dark nav rail.
        shell: "border-shell-rule bg-shell-2 text-shell-ink hover:bg-[#2c3037]",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-9 px-3.5",
        lg: "h-11 px-5 text-[0.9375rem]",
        icon: "h-9 w-9 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
