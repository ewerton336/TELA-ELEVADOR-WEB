import { memo } from "react";
import { useClock } from "@/hooks/useClock";
import { Building2 } from "lucide-react";
import { Predio } from "@/services/predioService";

interface DigitalClockProps {
  predio: Predio | null;
}

export const DigitalClock = memo(function DigitalClock({ predio }: DigitalClockProps) {
  const { timeFormatted, day, monthShort } = useClock();

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Logo/Nome do condomínio */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="shrink-0 p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
          <Building2 className="w-5 h-5 text-blue-400" />
        </div>
        <div className="block min-w-0 max-w-[9rem]">
          <p className="text-white font-display font-semibold text-base leading-[1.12]">
            {predio?.nome || "Carregando..."}
          </p>
          <p className="text-white/50 text-xs leading-tight truncate">{predio?.cidade || ""}</p>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <div className="clock-badge">
          <span className="clock-badge-day">{day}</span>
          <span className="clock-badge-month">{monthShort}</span>
        </div>
        <span className="text-2xl font-display font-bold text-white tabular-nums leading-none">
          {timeFormatted}
        </span>
      </div>
    </div>
  );
});
