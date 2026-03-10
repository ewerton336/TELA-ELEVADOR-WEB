import React from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import type { LucideIcon } from "lucide-react";

export interface ModuleToggleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  /** Additional content rendered below the toggle (e.g. stats, extra buttons) */
  children?: React.ReactNode;
}

/**
 * ModuleToggleCard — replaces the 4 identical toggle cards in Admin.tsx "Módulos da Tela".
 * Each card had ~25 lines of JSX; this reduces it to 1 line per card.
 */
export const ModuleToggleCard: React.FC<ModuleToggleCardProps> = ({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  children,
}) => (
  <div
    className={cn(
      "flex flex-col p-3 rounded-lg border transition-all",
      enabled
        ? "border-green-500/30 bg-green-500/10"
        : "border-white/10 bg-white/5 opacity-60",
    )}
  >
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={cn(
            "p-2 rounded-lg",
            enabled ? "bg-green-500/20" : "bg-white/10",
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4",
              enabled ? "text-green-400" : "text-white/40",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-medium text-sm",
              enabled ? "text-white" : "text-white/50",
            )}
          >
            {title}
          </p>
          <p className="text-white/30 text-[10px]">{description}</p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>

    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full w-fit",
        enabled
          ? "bg-green-500/20 text-green-300"
          : "bg-white/10 text-white/40",
      )}
    >
      {enabled ? "Ativado" : "Desativado"}
    </span>

    {children}
  </div>
);
