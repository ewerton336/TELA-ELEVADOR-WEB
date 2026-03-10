import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface FormFieldProps
  extends Omit<React.ComponentProps<"input">, "onChange"> {
  label: string;
  /** Dark-theme variant used in Admin pages */
  dark?: boolean;
  /** Optional hint text below the input */
  hint?: string;
  /** Controlled value */
  value: string;
  /** Change handler — receives the raw string */
  onValueChange: (value: string) => void;
}

/**
 * FormField — Label + Input pair that replaces the repeated
 * `<div className="space-y-1"><Label>…</Label><Input … /></div>` pattern
 * used 15+ times across Admin.tsx & Master.tsx.
 */
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    { label, dark = false, hint, value, onValueChange, className, id, ...rest },
    ref,
  ) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1">
        <Label
          htmlFor={inputId}
          className={cn(dark && "text-white text-xs")}
        >
          {label}
        </Label>
        <Input
          ref={ref}
          id={inputId}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(
            dark &&
              "bg-white/10 border-white/20 text-white placeholder:text-white/40 h-8 text-sm",
            className,
          )}
          {...rest}
        />
        {hint && (
          <p className={cn("text-[10px]", dark ? "text-white/30" : "text-muted-foreground")}>
            {hint}
          </p>
        )}
      </div>
    );
  },
);
FormField.displayName = "FormField";
