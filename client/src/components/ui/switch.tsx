import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, checked, ...props }, ref) => {
  const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl';
  
  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer relative h-[24px] w-[44px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        backgroundColor: checked ? '#FF6600' : '#D1D5DB',
        position: 'relative',
      }}
      checked={checked}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "block h-[20px] w-[20px] rounded-full ring-0 transition-all duration-200 ease-in-out",
        )}
        style={{
          backgroundColor: '#FFFFFF',
          position: 'absolute',
          top: '50%',
          left: isRTL ? undefined : (checked ? '22px' : '2px'),
          right: isRTL ? (checked ? '22px' : '2px') : undefined,
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
      />
    </SwitchPrimitives.Root>
  );
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
