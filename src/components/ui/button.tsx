import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-display text-base font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[1.125rem] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-[hsl(199_89%_58%)] text-primary-foreground shadow-[0_4px_16px_-4px_hsl(199_89%_68%/0.5),inset_0_1px_0_hsl(0_0%_100%/0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-6px_hsl(199_89%_68%/0.65),inset_0_1px_0_hsl(0_0%_100%/0.25)]",
        destructive:
          "bg-gradient-to-b from-destructive to-[hsl(0_74%_50%)] text-destructive-foreground shadow-[0_4px_14px_-4px_hsl(0_84%_60%/0.5),inset_0_1px_0_hsl(0_0%_100%/0.15)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_-6px_hsl(0_84%_60%/0.6),inset_0_1px_0_hsl(0_0%_100%/0.15)]",
        outline:
          "border border-primary/35 bg-primary/5 text-foreground backdrop-blur-sm hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_18px_-4px_hsl(199_89%_68%/0.4)]",
        secondary:
          "bg-gradient-to-b from-secondary to-[hsl(270_55%_62%)] text-secondary-foreground shadow-[0_4px_16px_-4px_hsl(270_55%_72%/0.5),inset_0_1px_0_hsl(0_0%_100%/0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-6px_hsl(270_55%_72%/0.6),inset_0_1px_0_hsl(0_0%_100%/0.2)]",
        ghost: "font-body font-medium hover:bg-primary/10 hover:text-primary",
        link: "font-body text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-10 rounded-lg px-4 text-sm",
        lg: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
