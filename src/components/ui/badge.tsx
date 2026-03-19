import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Professional status badges
        paid: "border-transparent bg-[hsl(var(--status-paid-bg))] text-[hsl(var(--status-paid))]",
        pending: "border-transparent bg-[hsl(var(--status-pending-bg))] text-[hsl(43,70%,35%)]",
        cancelled: "border-transparent bg-[hsl(var(--status-cancelled-bg))] text-[hsl(var(--status-cancelled))]",
        late: "border-transparent bg-[hsl(var(--status-late-bg))] text-[hsl(var(--status-late))]",
        confirmed: "border-transparent bg-[hsl(var(--status-confirmed-bg))] text-[hsl(var(--status-confirmed))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
