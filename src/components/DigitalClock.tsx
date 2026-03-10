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
    <div className="flex items-center gap-3">
      {/* Logo/Nome do condomínio */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
          <Building2 className="w-5 h-5 text-blue-400" />
        </div>
        <div className="hidden sm:block">
          <p className="text-white font-display font-semibold text-sm">
            {predio?.nome || "Carregando..."}
          </p>
          <p className="text-white/50 text-[10px]">{predio?.cidade || ""}</p>
        </div>
      </div>

      {/* Separador */}
      <div className="w-px h-8 bg-white/20" />

      {/* Relógio — badge de data + hora */}
      <div className="flex flex-col items-end gap-0.5">
        {/* Linha superior: dia + mês rotacionado */}
        <div className="clock-badge">
          <span className="clock-badge-day">{day}</span>
          <span className="clock-badge-month">{monthShort}</span>
        </div>
        {/* Linha inferior: hora */}
        <span className="text-2xl font-display font-bold text-white tabular-nums leading-none">
          {timeFormatted}
        </span>
      </div>
    </div>
  );
});
