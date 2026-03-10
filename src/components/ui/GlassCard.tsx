import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spacing below the card — maps to Tailwind margin classes */
  spacing?: "none" | "sm" | "md";
}

const spacingMap = {
  none: "",
  sm: "mb-3 sm:mb-4",
  md: "mb-4 sm:mb-6",
} as const;

/**
 * GlassCard — wrapper around shadcn Card with the glass-card theme.
 * Replaces the repeated `<Card className="glass-card border-white/10 mb-3 sm:mb-4">` pattern.
 */
const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, spacing = "none", ...props }, ref) => (
    <Card
      ref={ref}
      className={cn("glass-card border-white/10", spacingMap[spacing], className)}
      {...props}
    />
  ),
);
GlassCard.displayName = "GlassCard";

/* Re-export card internals so consumers don't need a separate import */
export { GlassCard, CardContent, CardHeader, CardTitle };
