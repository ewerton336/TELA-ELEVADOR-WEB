import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  /** Number of skeleton lines to render */
  lines?: number;
  variant?: "card" | "inline" | "full";
  className?: string;
}

const variantStyles = {
  card: "space-y-3 p-4",
  inline: "flex items-center gap-3",
  full: "w-full space-y-2",
} as const;

/**
 * SkeletonLoader — replaces the 3 different `animate-pulse` implementations
 * used in NewsCarousel, WeatherCard, and ScreenMonitor.
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  lines = 3,
  variant = "card",
  className,
}) => (
  <div className={cn("animate-pulse", variantStyles[variant], className)}>
    {Array.from({ length: lines }, (_, i) => (
      <div
        key={i}
        className={cn(
          "rounded bg-white/10",
          variant === "inline" ? "h-4 flex-1" : "h-3 w-full",
          i === 0 && variant !== "inline" && "h-4 w-3/4",
          i === lines - 1 && variant !== "inline" && "w-2/3",
        )}
      />
    ))}
  </div>
);
