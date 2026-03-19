import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, maxLength, ...props }, ref) => {
    // Default security limits based on input type
    const getDefaultMaxLength = () => {
      if (maxLength !== undefined) return maxLength;
      switch (type) {
        case 'email': return 254; // RFC 5321 limit
        case 'password': return 128;
        case 'url': return 2048;
        case 'tel': return 20;
        default: return 255;
      }
    };

    return (
      <input
        type={type}
        maxLength={getDefaultMaxLength()}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-base text-black ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
