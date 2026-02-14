import { useClock } from "@/hooks/useClock";
import { Building2 } from "lucide-react";

export function DigitalClock() {
  const { timeFormatted, seconds, dateFormatted } = useClock();

  return (
    <div className="flex items-center gap-3">
      {/* Logo/Nome do condomínio */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
          <Building2 className="w-5 h-5 text-blue-400" />
        </div>
        <div className="hidden sm:block">
          <p className="text-white font-display font-semibold text-sm">
            Gramado IX
          </p>
          <p className="text-white/50 text-[10px]">Praia Grande, SP</p>
        </div>
      </div>

      {/* Separador */}
      <div className="w-px h-8 bg-white/20" />

      {/* Relógio */}
      <div className="text-right">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-display font-bold text-white tabular-nums">
            {timeFormatted}
          </span>
          <span className="text-sm text-white/50 tabular-nums">:{seconds}</span>
        </div>
        <p className="text-white/50 text-[10px] capitalize">{dateFormatted}</p>
      </div>
    </div>
  );
}
